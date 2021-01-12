import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { ILogger } from '../../common/interfaces';
import { ITaskId } from '../interfaces';

@injectable()
export class ProgressManager {
  public constructor(@inject(Services.LOGGER) private readonly logger: ILogger) {}
  public taskComplete(taskId: ITaskId): void {
    throw new Error('not implemented');
  }
}
