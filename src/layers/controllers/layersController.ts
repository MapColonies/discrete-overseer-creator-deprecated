import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { Services } from '../../common/constants';
import { ILogger } from '../../common/interfaces';
import { LayersManager } from '../models/layersManager';
import { filterLayerMetadata } from '../../common/utills/ingestionParamExtractor';
import { IngestionMetadata, LayerIngestionParams } from '../interfaces';

type CreateLayerHandler = RequestHandler<undefined, undefined, LayerIngestionParams>;

@injectable()
export class LayersController {
  public constructor(@inject(Services.LOGGER) private readonly logger: ILogger, @inject(LayersManager) private readonly manager: LayersManager) {}

  public createLayer: CreateLayerHandler = async (req, res, next) => {
    try {
      const sourceRequest: IngestionMetadata = {
        metadata: filterLayerMetadata(req.body.metadata),
        originDirectory: req.body.originDirectory,
        fileNames: req.body.fileNames,
        origin: req.body.origin,
        grid: req.body.grid,
      };
      await this.manager.createLayer(sourceRequest);
      return res.sendStatus(httpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
