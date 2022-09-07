import { IRasterCatalogUpsertRequestBody, LayerMetadata, ProductType } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { OperationStatus, MapServerCacheType } from '../../common/enums';
import { IConfig, ILogger } from '../../common/interfaces';
import { IPublishMapLayerRequest, PublishedMapLayerCacheType } from '../../layers/interfaces';
import { CatalogClient } from '../../serviceClients/catalogClient';
import { MapPublisherClient } from '../../serviceClients/mapPublisherClient';
import { JobManagerClient } from '../../serviceClients/jobManagerClient';
import { getMapServingLayerName } from '../../utils/layerNameGenerator';
import { OperationTypeEnum, SyncClient } from '../../serviceClients/syncClient';
import { MetadataMerger } from '../../update/metadataMerger';
import { ICompletedTasks, IGetTaskResponse } from '../interfaces';
import { BadRequestError } from '../../common/exceptions/http/badRequestError';
import { ILinkBuilderData, LinkBuilder } from './linksBuilder';

interface IngestionTaskTypes {
  tileMergeTask: string;
  tileSplitTask: string;
}

@injectable()
export class TasksManager {
  private readonly mapServerUrl: string;
  private readonly cacheType: PublishedMapLayerCacheType;
  private readonly shouldSync: boolean;
  private readonly ingestionNewJobType: string;
  private readonly ingestionUpdateJobType: string;
  private readonly ingestionTaskType: IngestionTaskTypes;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    @inject(SyncClient) private readonly syncClient: SyncClient,
    private readonly jobManager: JobManagerClient,
    private readonly mapPublisher: MapPublisherClient,
    private readonly catalogClient: CatalogClient,
    private readonly linkBuilder: LinkBuilder,
    private readonly metadataMerger: MetadataMerger
  ) {
    this.mapServerUrl = config.get<string>('publicMapServerURL');
    const mapServerCacheType = config.get<string>('mapServerCacheType');
    this.shouldSync = config.get<boolean>('shouldSync');
    this.ingestionNewJobType = config.get<string>('ingestionNewJobType');
    this.ingestionUpdateJobType = config.get<string>('ingestionUpdateJobType');
    this.ingestionTaskType = config.get<IngestionTaskTypes>('ingestionTaskType');
    this.cacheType = this.getCacheType(mapServerCacheType);
  }

  public async taskComplete(jobId: string, taskId: string): Promise<void> {
    const job = await this.jobManager.getJobStatus(jobId);
    const task = await this.jobManager.getTask(jobId, taskId);

    if (job.type === this.ingestionUpdateJobType && task.type === this.ingestionTaskType.tileMergeTask) {
      this.logger.log(`info`, `[TasksManager][taskComplete] Completing Ingestion-Update job with jobId ${jobId} and taskId ${taskId}.`);
      await this.handleUpdateIngestion(job, task);
    } else if (
      (task.type === this.ingestionTaskType.tileMergeTask || task.type === this.ingestionTaskType.tileSplitTask) &&
      job.type === this.ingestionNewJobType
    ) {
      this.logger.log(`info`, `[TasksManager][taskComplete] Completing Ingestion-New job with jobId ${jobId} and taskId ${taskId}.`);
      await this.handleNewIngestion(job, task);
    } else {
      throw new BadRequestError(
        `[TasksManager][taskComplete] Could not complete task. Job type "${job.type}" and task type "${task.type}" combination isn't supported.`
      );
    }

    if (job.status === OperationStatus.IN_PROGRESS) {
      await this.jobManager.updateJobStatus(job.id, OperationStatus.IN_PROGRESS, job.percentage);
    }
  }

  private async publishToCatalog(jobId: string, metadata: LayerMetadata, layerName: string): Promise<string> {
    try {
      this.logger.log('info', `[TasksManager][publishToCatalog] layer ${metadata.productId as string} version ${metadata.productVersion as string}`);
      const linkData: ILinkBuilderData = {
        serverUrl: this.mapServerUrl,
        layerName: layerName,
      };
      const publishModel: IRasterCatalogUpsertRequestBody = {
        metadata: metadata,
        links: this.linkBuilder.createLinks(linkData),
      };
      return await this.catalogClient.publish(publishModel);
    } catch (err) {
      await this.jobManager.updateJobStatus(jobId, OperationStatus.FAILED, undefined, 'Failed to publish layer to catalog');
      throw err;
    }
  }

  private async publishToMappingServer(jobId: string, metadata: LayerMetadata, layerName: string, relativePath: string): Promise<void> {
    const id = metadata.productId as string;
    const version = metadata.productVersion as string;
    try {
      this.logger.log('info', `[TasksManager][publishToMappingServer] layer ${id} version  ${version}`);
      const publishReq: IPublishMapLayerRequest = {
        name: `${layerName}`,
        tilesPath: relativePath,
        cacheType: this.cacheType,
      };
      await this.mapPublisher.publishLayer(publishReq);
    } catch (err) {
      await this.jobManager.updateJobStatus(jobId, OperationStatus.FAILED, undefined, 'Failed to publish layer to mapping server');
      throw err;
    }
  }

  private getCacheType(mapServerCacheType: string): PublishedMapLayerCacheType {
    let cacheType: PublishedMapLayerCacheType;
    switch (mapServerCacheType.toLowerCase()) {
      case MapServerCacheType.S3.toLowerCase(): {
        cacheType = PublishedMapLayerCacheType.S3;
        break;
      }
      case MapServerCacheType.FS.toLowerCase(): {
        cacheType = PublishedMapLayerCacheType.FS;
        break;
      }
      default: {
        throw new Error(`Unsupported storageProvider configuration ${mapServerCacheType}`);
      }
    }
    return cacheType;
  }

  private async abortJobWithStatusFailed(jobId: string, reason?: string): Promise<void> {
    this.logger.log(`info`, `Aborting job with ID ${jobId}`);
    await this.jobManager.abortJob(jobId);
    this.logger.log(`info`, `Updating job ${jobId} with status ${OperationStatus.FAILED}`);
    await this.jobManager.updateJobStatus(jobId, OperationStatus.FAILED, undefined, reason);
  }

  private async handleUpdateIngestion(job: ICompletedTasks, task: IGetTaskResponse): Promise<void> {
    if (task.status === OperationStatus.FAILED && job.status !== OperationStatus.FAILED) {
      await this.abortJobWithStatusFailed(job.id, `Failed to update ingestion`);
      job.status = OperationStatus.FAILED;
    } else if (task.status === OperationStatus.COMPLETED) {
      const highestVersion = await this.catalogClient.getHighestLayerVersion(job.metadata.productId as string, job.metadata.productType as string);

      const catalogRecord = await this.catalogClient.findRecord(
        job.metadata.productId as string,
        highestVersion?.toFixed(1) as string,
        job.metadata.productType as string
      );

      this.logger.log(
        `debug`,
        `Merging metadata of ${job.id}: ${JSON.stringify(job.metadata)} with metadata from catalog record ${
          catalogRecord?.id as string
        }: ${JSON.stringify(catalogRecord?.metadata)}`
      );
      const mergedData = this.metadataMerger.merge(catalogRecord?.metadata as LayerMetadata, job.metadata);
      this.logger.log(`info`, `Updating catalog record ${catalogRecord?.id as string} with new metadata`);
      await this.catalogClient.update(catalogRecord?.id as string, mergedData);

      if (job.isSuccessful) {
        this.logger.log(`info`, `Updating status of job ${job.id} to be ${OperationStatus.COMPLETED}`);
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        await this.jobManager.updateJobStatus(job.id, OperationStatus.COMPLETED, 100, undefined, catalogRecord?.id);
        job.status = OperationStatus.COMPLETED;
      }
    }
  }

  private async handleNewIngestion(job: ICompletedTasks, task: IGetTaskResponse): Promise<void> {
    if (task.status === OperationStatus.FAILED && job.status !== OperationStatus.FAILED) {
      await this.abortJobWithStatusFailed(job.id, `Failed to generate tiles`);
      job.status = OperationStatus.FAILED;
    } else if (job.isSuccessful) {
      const layerName = getMapServingLayerName(job.metadata.productId as string, job.metadata.productType as ProductType);
      this.logger.log(`debug`, `[TasksManager][handleNewIngestion] Layer name to be published to map serveris "${layerName}"`);
      await this.publishToMappingServer(job.id, job.metadata, layerName, job.relativePath);
      const catalogId = await this.publishToCatalog(job.id, job.metadata, layerName);

      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      await this.jobManager.updateJobStatus(job.id, OperationStatus.COMPLETED, 100, undefined, catalogId);
      job.status = OperationStatus.COMPLETED;

      if (this.shouldSync) {
        try {
          await this.syncClient.triggerSync(
            job.metadata.productId as string,
            job.metadata.productVersion as string,
            job.metadata.productType as ProductType,
            OperationTypeEnum.ADD,
            job.relativePath
          );
        } catch (err) {
          this.logger.log(
            'error',
            `[TasksManager][handleNewIngestion] failed to trigger sync productId ${job.metadata.productId as string} productVersion ${
              job.metadata.productVersion as string
            }. error=${(err as Error).message}`
          );
        }
      }
    }
  }
}
