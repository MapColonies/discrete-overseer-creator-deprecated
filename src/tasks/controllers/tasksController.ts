import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { Services } from '../../common/constants';
import { ILogger } from '../../common/interfaces';

import { TasksManager } from '../models/tasksManager';
import { ITaskId } from '../interfaces';

type CompleteWorkerTaskHandler = RequestHandler<ITaskId>;

@injectable()
export class TasksController {
  public constructor(@inject(Services.LOGGER) private readonly logger: ILogger, @inject(TasksManager) private readonly manager: TasksManager) {}

  public completeWorkerTask: CompleteWorkerTaskHandler = async (req, res, next) => {
    try {
      await this.manager.taskComplete(req.params);
      return res.sendStatus(httpStatus.OK);
    } catch (err) {
      next(err);
    }
  };
}
