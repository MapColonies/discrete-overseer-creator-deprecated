import { LayerMetadata } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { IConfig, ILogger } from '../../common/interfaces';
import { StorageClient } from '../../serviceClients/storageClient';
import { TillerClient } from '../../serviceClients/tillerClient';
import { ITillerRequest } from '../../tasks/interfaces';

@injectable()
export class LayersManager {
  private readonly zoomBatches: string[];
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly tiller: TillerClient,
    private readonly db: StorageClient
  ) {
    const batches = config.get<string>('tiling.zoomGroups');
    this.zoomBatches = batches.split(',');
  }

  public async createLayer(metadata: LayerMetadata): Promise<void> {
    this.logger.log('info', `saving metadata for layer ${metadata.source as string}`);
    await this.db.saveMetadata(metadata);

    //add tiling tasks to queue
    const tillerTasks: Promise<void>[] = [];
    //TODO: handle case of kafka errors after metadata save
    this.zoomBatches.forEach((batch) => {
      const limits = batch.split('-').map((value) => Number.parseInt(value));
      const minZoom = Math.min(...limits);
      const maxZoom = Math.max(...limits);
      const tillingReq: ITillerRequest = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        discrete_id: metadata.source as string,
        version: metadata.version as string,
        //TODO: replace with real task id when integrating with db
        // eslint-disable-next-line @typescript-eslint/naming-convention
        task_id: '',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        min_zoom_level: minZoom,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        max_zoom_level: maxZoom,
      };
      this.logger.log('info', `queuing zoom level(s): ${batch} for layer ${tillingReq.discrete_id}-${tillingReq.version}`);
      tillerTasks.push(this.tiller.addTilingRequest(tillingReq));
    });
    await Promise.all(tillerTasks);
  }
}
