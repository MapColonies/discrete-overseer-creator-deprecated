import { ImageMetadata } from '@map-colonies/mc-model-types';
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

  public async createLayer(metadata: ImageMetadata): Promise<void> {
    await this.db.saveMetadata(metadata);

    //add tiling tasks to queue
    const tillerTasks: Promise<void>[] = [];
    this.zoomBatches.forEach((batch) => {
      //TODO: replace const version with model when updated.
      tillerTasks.push(this.tiller.addTilingRequest(metadata.id as string, '1', batch));
    });
    await Promise.all(tillerTasks);
  }
}
