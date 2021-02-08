import { LayerMetadata } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { IConfig, ILogger } from '../../common/interfaces';
import { StorageClient } from '../../serviceClients/storageClient';
import { TillerClient } from '../../serviceClients/tillerClient';

@injectable()
export class LayersManager {
  private readonly zoomBatches: number[][];
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly tiller: TillerClient,
    private readonly db: StorageClient
  ) {
    const batches = config.get<string>('tiling.zoomGroups');
    this.zoomBatches = JSON.parse(batches) as number[][];
  }

  public async createLayer(metadata: LayerMetadata): Promise<void> {
    this.logger.log('info', `saving metadata for layer ${metadata.source as string}`);
    await this.db.saveMetadata(metadata);

    //add tiling tasks to queue
    const tillerTasks: Promise<void>[] = [];
    //TODO: handle case of kafka errors after metadata save
    this.zoomBatches.forEach((batch) => {
      this.logger.log('info', `queuing zoom levels: ${batch.join(',')} for layer ${metadata.source as string}-${metadata.version as string}`);
      tillerTasks.push(this.tiller.addTilingRequest(metadata.source as string, metadata.version as string, batch));
    });
    await Promise.all(tillerTasks);
  }
}
