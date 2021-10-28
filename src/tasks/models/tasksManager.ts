import { IRasterCatalogUpsertRequestBody, LayerMetadata, ProductType } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { OperationStatus, StorageProvider } from '../../common/enums';
import { IConfig, ILogger } from '../../common/interfaces';
import { IPublishMapLayerRequest, PublishedMapLayerCacheType } from '../../layers/interfaces';
import { CatalogClient } from '../../serviceClients/catalogClient';
import { MapPublisherClient } from '../../serviceClients/mapPublisherClient';
import { StorageClient } from '../../serviceClients/storageClient';
import { ZoomLevelCalculator } from '../../utils/zoomToResolution';
import { getMapServingLayerName } from '../../utils/layerNameGenerator';
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
    private readonly zoomLevelCalculateor: ZoomLevelCalculator,
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
    this.logger.log('info', `[TasksManager][taskComplete] checking tiling status of job ${jobId} task  ${taskId}`);
    const res = await this.db.getCompletedZoomLevels(jobId);
    if (res.completed) {
      if (res.successful) {
        const layerName = getMapServingLayerName(
          res.metadata.productId as string,
          res.metadata.productVersion as string,
          res.metadata.productType as ProductType
        );
        await this.publishToMappingServer(jobId, res.metadata, layerName);
        await this.publishToCatalog(jobId, res.metadata, layerName);

        // todo: In update scenario need to change the logic to support history and update unified files
        if (res.metadata.productType === ProductType.ORTHOPHOTO_HISTORY) {
          const clonedLayer = { ...res.metadata };
          clonedLayer.productType = ProductType.ORTHOPHOTO;
          const unifiedLayerName = getMapServingLayerName(
            clonedLayer.productId as string,
            clonedLayer.productVersion as string,
            clonedLayer.productType
          );
          await this.publishToMappingServer(jobId, res.metadata, unifiedLayerName);
          await this.publishToCatalog(jobId, clonedLayer, unifiedLayerName);
        }
        await this.db.updateJobStatus(jobId, OperationStatus.COMPLETED);

        const shouldSync = this.config.get<boolean>('shouldSync');

        if (shouldSync) {
          try {
            await this.syncClient.triggerSync(
              res.metadata.productId as string,
              res.metadata.productVersion as string,
              SyncTypeEnum.NEW_DISCRETE,
              OperationTypeEnum.ADD
            );
          } catch (err) {
            this.logger.log(
              'error',
              `[TasksManager][taskComplete] failed to trigger sync productId ${res.metadata.productId as string} productVersion ${
                res.metadata.productVersion as string
              }. error=${(err as Error).message}`
            );
          }
        }
      } else {
        this.logger.log(
          'error',
          `[TasksManager][taskComplete] failed to generate tiles for job ${jobId} task  ${taskId}. please check discrete worker logs from more info`
        );
        await this.db.updateJobStatus(jobId, OperationStatus.FAILED, 'Failed to generate tiles');
      }
    }
  }

  private async publishToCatalog(jobId: string, metadata: LayerMetadata, layerName: string): Promise<void> {
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
      await this.catalogClient.publish(publishModel);
    } catch (err) {
      await this.db.updateJobStatus(jobId, OperationStatus.FAILED, 'Failed to publish layer to catalog');
      throw err;
    }
  }

  private async publishToMappingServer(jobId: string, metadata: LayerMetadata, layerName: string): Promise<void> {
    const id = metadata.productId as string;
    const version = metadata.productVersion as string;
    const productType = metadata.productType as string;
    try {
      this.logger.log('info', `[TasksManager][publishToMappingServer] layer ${id} version  ${version}`);
      const maxZoom = this.zoomLevelCalculateor.getZoomByResolution(metadata.resolution as number);
      const publishReq: IPublishMapLayerRequest = {
        name: `${layerName}`,
        description: metadata.description as string,
        maxZoomLevel: maxZoom,
        tilesPath: `${id}/${version}/${productType}`,
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
}
