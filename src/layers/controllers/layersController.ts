import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { IngestionParams } from '@map-colonies/mc-model-types';
import { Services } from '../../common/constants';
import { ILogger } from '../../common/interfaces';

import { LayersManager } from '../models/layersManager';
import { filterLayerMetadata } from '../../common/utills/ingestionParamExtractor';

type CreateLayerHandler = RequestHandler<undefined, undefined, IngestionParams>;

@injectable()
export class LayersController {
  public constructor(@inject(Services.LOGGER) private readonly logger: ILogger, @inject(LayersManager) private readonly manager: LayersManager) {}

  public createLayer: CreateLayerHandler = async (req, res, next) => {
    try {
      const sourceRequest: IngestionParams = { fileNames: req.body.fileNames, originDirectory: req.body.originDirectory, metadata: req.body.metadata };
      sourceRequest.metadata = filterLayerMetadata(sourceRequest.metadata);
      await this.manager.createLayer(sourceRequest);
      return res.sendStatus(httpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
