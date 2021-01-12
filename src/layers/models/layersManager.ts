import { ImageMetadata } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { ILogger } from '../../common/interfaces';

@injectable()
export class LayersManager {
  public constructor(@inject(Services.LOGGER) private readonly logger: ILogger) {}
  public createLayer(metadata: ImageMetadata): void {
    throw new Error('not implemented');
  }
}
