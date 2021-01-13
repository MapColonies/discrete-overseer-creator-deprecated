import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { ImageMetadata } from '@map-colonies/mc-model-types';
import { Services } from '../../common/constants';
import { ILogger } from '../../common/interfaces';

import { LayersManager } from '../models/layersManager';

type CreateLayerHandler = RequestHandler<undefined, undefined, ImageMetadata>;

@injectable()
export class LayersController {
  public constructor(@inject(Services.LOGGER) private readonly logger: ILogger, @inject(LayersManager) private readonly manager: LayersManager) {}

  public createLayer: CreateLayerHandler = async (req, res, next) => {
    try {
      await this.manager.createLayer(req.body);
      return res.sendStatus(httpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
