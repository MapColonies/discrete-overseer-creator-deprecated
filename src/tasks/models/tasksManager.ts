import { IRasterCatalogUpsertRequestBody, LayerMetadata, ProductType } from '@map-colonies/mc-model-types';
import { container, inject, injectable } from 'tsyringe';
import { degreesPerPixelToZoomLevel } from '@map-colonies/mc-utils';
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
    this.logger.log('info', `[TasksManager][taskComplete] checking tiling status of job ${jobId} task ${taskId}`);
    const job = await this.jobManager.getJob(jobId);
    const task = await this.jobManager.getTask(jobId, taskId);

    if ((job.type === this.ingestionNewJobType || job.type === this.ingestionUpdateJobType) && task.type === this.ingestionTaskType.tileMergeTask) {
      await this.handleMergeTask(job, task);
    } else if (job.type === this.ingestionNewJobType && task.type === this.ingestionTaskType.tileSplitTask) {
      await this.handleSplitTask(job, task);
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
      await this.jobManager.updateJobStatus(jobId, OperationStatus.FAILED, 'Failed to publish layer to catalog');
      throw err;
    }
  }

  private async publishToMappingServer(jobId: string, metadata: LayerMetadata, layerName: string, relativePath: string): Promise<void> {
    const id = metadata.productId as string;
    const version = metadata.productVersion as string;
    try {
      this.logger.log('info', `[TasksManager][publishToMappingServer] layer ${id} version  ${version}`);
      const maxZoom = degreesPerPixelToZoomLevel(metadata.maxResolutionDeg as number);
      const publishReq: IPublishMapLayerRequest = {
        name: `${layerName}`,
        maxZoomLevel: maxZoom,
        tilesPath: relativePath,
        cacheType: this.cacheType,
      };
      await this.mapPublisher.publishLayer(publishReq);
    } catch (err) {
      await this.jobManager.updateJobStatus(jobId, OperationStatus.FAILED, 'Failed to publish layer to mapping server');
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

  private async handleMergeTask(job: ICompletedTasks, task: IGetTaskResponse): Promise<void> {
    if (task.status === OperationStatus.FAILED) {
      await this.jobManager.abortJob(job.id);
      await this.jobManager.updateJobStatus(job.id, OperationStatus.FAILED);
    } else if (task.status === OperationStatus.COMPLETED) {
      const catalogRecord = await this.catalogClient.findRecord(
        job.metadata.productId as string,
        job.metadata.productVersion as string,
        job.metadata.productType as string
      );

      if (job.completedTasksCount === 0) {
        const mergedData = this.metadataMerger.merge(job.metadata, catalogRecord?.metadata as LayerMetadata);
        await this.catalogClient.update(catalogRecord?.id as string, mergedData);
      }

      if (job.successful) {
        await this.jobManager.updateJobStatus(job.id, OperationStatus.COMPLETED, undefined, catalogRecord?.id);
      }
    }
  }

  private async handleSplitTask(job: ICompletedTasks, task: IGetTaskResponse): Promise<void> {
    if (job.status != OperationStatus.FAILED && job.completed) {
      if (job.successful) {
        const layerName = getMapServingLayerName(job.metadata.productId as string, job.metadata.productType as ProductType);
        await this.publishToMappingServer(job.id, job.metadata, layerName, job.relativePath);
        const catalogId = await this.publishToCatalog(job.id, job.metadata, layerName);

        await this.jobManager.updateJobStatus(job.id, OperationStatus.COMPLETED, undefined, catalogId);

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
              `[TasksManager][handleSplitTask] failed to trigger sync productId ${job.metadata.productId as string} productVersion ${
                job.metadata.productVersion as string
              }. error=${(err as Error).message}`
            );
          }
        }
      } else if (job.status != OperationStatus.ABORTED && job.status != OperationStatus.EXPIRED) {
        this.logger.log(
          'error',
          `[TasksManager][handleSplitTask] failed to generate tiles for job ${job.id} task ${task.id}. please check discrete worker logs from more info`
        );
        await this.jobManager.updateJobStatus(job.id, OperationStatus.FAILED, 'Failed to generate tiles');
      }
    }
  }
}
