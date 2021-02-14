import { LayerMetadata } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { IConfig, ILogger } from '../../common/interfaces';
import { StorageClient } from '../../serviceClients/storageClient';
import { TillerClient } from '../../serviceClients/tillerClient';
import { ITaskZoomRange } from '../../tasks/interfaces';

@injectable()
export class LayersManager {
  private readonly zoomRanges: ITaskZoomRange[];
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly tiller: TillerClient,
    private readonly db: StorageClient
  ) {
    this.zoomRanges = this.getZoomRanges(config);
  }

  public async createLayer(metadata: LayerMetadata): Promise<void> {
    this.logger.log('info', `saving metadata for layer ${metadata.source as string}`);
    const tillerRequests = await this.db.createLayerTasks(metadata, this.zoomRanges);
    //add tiling tasks to queue
    const tillerTasks: Promise<void>[] = [];
    tillerRequests.forEach((req) => {
      //TODO: handle case of kafka errors after metadata save
      tillerTasks.push(this.tiller.addTilingRequest(req));
      this.logger.log('info', `queuing zoom levels: ${req.min_zoom_level}-${req.max_zoom_level} for layer ${req.discrete_id}-${req.version}`);
    });
    await Promise.all(tillerTasks);
  }

  private getZoomRanges(config: IConfig): ITaskZoomRange[] {
    const batches = config.get<string>('tiling.zoomGroups');
    const zoomBatches = batches.split(',');
    const zoomRanges = zoomBatches.map((batch) => {
      const limits = batch.split('-').map((value) => Number.parseInt(value));
      const zoomRange: ITaskZoomRange = {
        minZoom: Math.min(...limits),
        maxZoom: Math.max(...limits),
      };
      return zoomRange;
    });
    return zoomRanges;
  }
}
