import { IRasterCatalogUpsertRequestBody, LayerMetadata } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { AxiosError } from 'axios';
import { Services } from '../../common/constants';
import { OperationStatus, StorageProvider } from '../../common/enums';
import { IConfig, ILogger } from '../../common/interfaces';
import { IPublishMapLayerRequest, PublishedMapLayerCacheType } from '../../layers/interfaces';
import { CatalogClient } from '../../serviceClients/catalogClient';
import { MapPublisherClient } from '../../serviceClients/mapPublisherClient';
import { StorageClient } from '../../serviceClients/storageClient';
import { ZoomLevelCalculateor } from '../../utils/zoomToResulation';
import { OperationTypeEnum, SyncClient, SyncTypeEnum } from '../../serviceClients/syncClient';
import { ILinkBuilderData, LinkBuilder } from './linksBuilder';

@injectable()
export class TasksManager {
  private readonly mapServerUrl: string;
  private readonly cacheType: PublishedMapLayerCacheType;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    @inject(SyncClient) private readonly syncClient: SyncClient,
    private readonly zoomLevelCalculateor: ZoomLevelCalculateor,
    private readonly db: StorageClient,
    private readonly mapPublisher: MapPublisherClient,
    private readonly catalogClient: CatalogClient,
    private readonly linkBuilder: LinkBuilder
  ) {
    this.mapServerUrl = config.get<string>('publicMapServerURL');
    const storageProviderConfig = config.get<string>('StorageProvider');
    this.cacheType = this.getCacheType(storageProviderConfig);
  }

  public async taskComplete(jobId: string, taskId: string): Promise<void> {
    this.logger.log('info', `checking tiling status of job ${jobId} task  ${taskId}`);
    const res = await this.db.getCompletedZoomLevels(jobId);
    if (res.completed) {
      if (res.successful) {
        const layerName = `${res.metadata.productId as string}-${res.metadata.productVersion as string}`;
        await this.publishToMappingServer(jobId, res.metadata, layerName);
        await this.publishToCatalog(jobId, res.metadata, layerName);
        await this.db.updateJobStatus(jobId, OperationStatus.COMPLETED);
        try {
          void this.syncClient.triggerSync(res.metadata.productId as string, res.metadata.productVersion as string, SyncTypeEnum.NEW_DISCRETE, OperationTypeEnum.ADD);
        } catch (err) {
          this.logger.log(
            'error',
            `[TasksManager][taskComplete] failed to trigger sync productId ${res.metadata.productId as string} productVersion ${
              res.metadata.productVersion as string
            }. error=${(err as AxiosError).message}`
          );
        }
      } else {
        this.logger.log('error', `failed generating tiles for job ${jobId} task  ${taskId}. please check discrete worker logs from more info`);
        await this.db.updateJobStatus(jobId, OperationStatus.FAILED, 'Failed to generate tiles');
      }
    }
  }

  private async publishToCatalog(jobId: string, metadata: LayerMetadata, layerName: string): Promise<void> {
    try {
      this.logger.log('info', `publishing layer ${metadata.productId as string} version  ${metadata.productVersion as string} to catalog`);
      const linkData: ILinkBuilderData = {
        serverUrl: this.mapServerUrl,
        layerName: layerName,
      };
      const publishModel: IRasterCatalogUpsertRequestBody = {
        metadata: metadata,
        links: this.linkBuilder.createLinks(linkData),
      };
      await this.catalogClient.publish(publishModel);
    } catch (err) {
      await this.db.updateJobStatus(jobId, OperationStatus.FAILED, 'Failed to publish layer to catalog');
      throw err;
    }
  }

  private async publishToMappingServer(jobId: string, metadata: LayerMetadata, layerName: string): Promise<void> {
    const id = metadata.productId as string;
    const version = metadata.productVersion as string;
    try {
      this.logger.log('info', `publishing layer ${id} version  ${version} to server`);
      const maxZoom = this.zoomLevelCalculateor.getZoomByResolution(metadata.resolution as number);
      const publishReq: IPublishMapLayerRequest = {
        name: `${layerName}`,
        description: metadata.description as string,
        maxZoomLevel: maxZoom,
        tilesPath: `${id}/${version}`,
        cacheType: this.cacheType,
      };
      await this.mapPublisher.publishLayer(publishReq);
    } catch (err) {
      await this.db.updateJobStatus(jobId, OperationStatus.FAILED, 'Failed to publish layer');
      throw err;
    }
  }

  private getCacheType(storageProvider: string): PublishedMapLayerCacheType {
    let cacheType: PublishedMapLayerCacheType;
    switch (storageProvider.toLowerCase()) {
      case StorageProvider.S3.toLowerCase(): {
        cacheType = PublishedMapLayerCacheType.S3;
        break;
      }
      case StorageProvider.FS.toLowerCase(): {
        cacheType = PublishedMapLayerCacheType.FS;
        break;
      }
      default: {
        throw new Error(`Unsupported storageProvider configuration ${storageProvider}`);
      }
    }
    return cacheType;
  }

  private getMaxZoom(zoomConfig: string): number {
    const zooms = zoomConfig.split(/,|-/).map((value) => Number.parseInt(value));
    return Math.max(...zooms);
  }
}
