import { LayerMetadata } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { OperationStatus } from '../../common/enums';
import { IConfig, ILogger } from '../../common/interfaces';
import { IPublishMapLayerRequest } from '../../layers/interfaces';
import { MapPublisherClient } from '../../serviceClients/mapPublisherClient';
import { StorageClient } from '../../serviceClients/storageClient';

@injectable()
export class TasksManager {
  private readonly maxZoom: number;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly db: StorageClient,
    private readonly mapPublisher: MapPublisherClient
  ) {
    const zoomConfig = config.get<string>('tiling.zoomGroups');
    this.maxZoom = this.getMaxZoom(zoomConfig);
  }

  public async taskComplete(jobId: string, taskId: string): Promise<void> {
    this.logger.log('info', `checking tiling status of job ${jobId} task  ${taskId}`);
    const res = await this.db.getCompletedZoomLevels(jobId);
    if (res.completed) {
      if (res.successful) {
        await this.publishToMappingServer(jobId, res.metaData);
        await this.publishToCatalog(jobId, res.metaData);
        await this.db.updateJobStatus(jobId, OperationStatus.COMPLETED);
      } else {
        this.logger.log('error', `failed generating tiles for job ${jobId} task  ${taskId}. please check discrete worker logs from more info`);
        await this.db.updateJobStatus(jobId, OperationStatus.FAILED, 'Failed to generate tiles');
      }
    }
  }

  private async publishToCatalog(jobId: string, metadata: LayerMetadata): Promise<void> {
    try {
      this.logger.log('info', `publishing layer ${metadata.id as string} version  ${metadata.version as string} to catalog`);
      //TODO: add publish to catalog step
      //await this.db.publishToCatalog(taskId);
    } catch (err) {
      await this.db.updateJobStatus(jobId, OperationStatus.FAILED, 'Failed to publish layer to catalog');
      //TODO: add error handling logic in case publishing to catalog failed after publishing to map proxy
      throw err;
    }
  }

  private async publishToMappingServer(jobId: string, metadata: LayerMetadata): Promise<void> {
    const id = metadata.id as string;
    const version = metadata.version as string;
    try {
      this.logger.log('info', `publishing layer ${id} version  ${version} to server`);
      const publishReq: IPublishMapLayerRequest = {
        name: `${id}-${version}`,
        description: metadata.dsc as string,
        //TODO: replace with zoom base on both config and source resolution
        maxZoomLevel: this.maxZoom,
        tilesPath: `${id}/${version}`,
      };
      await this.mapPublisher.publishLayer(publishReq);
    } catch (err) {
      await this.db.updateJobStatus(jobId, OperationStatus.FAILED, 'Failed to publish layer');
      //TODO: add error handling logic in case publishing to catalog failed after publishing to map proxy
      throw err;
    }
  }

  private getMaxZoom(zoomConfig: string): number {
    const zooms = zoomConfig.split(/,|-/).map((value) => Number.parseInt(value));
    return Math.max(...zooms);
  }
}
