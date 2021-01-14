import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { Services } from '../../common/constants';
import { ILogger } from '../../common/interfaces';

import { ProgressManager } from '../models/progressManager';
import { ITaskId } from '../interfaces';

type CompleteWorkerTaskHandler = RequestHandler<ITaskId>;

@injectable()
export class ProgressController {
  public constructor(@inject(Services.LOGGER) private readonly logger: ILogger, @inject(ProgressManager) private readonly manager: ProgressManager) {}

  public completeWorkerTask: CompleteWorkerTaskHandler = async (req, res, next) => {
    try {
      await this.manager.taskComplete(req.params);
      return res.sendStatus(httpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
