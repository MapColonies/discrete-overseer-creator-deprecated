import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { ILogger } from '../../common/interfaces';
import { PublisherClient } from '../../serviceClients/publisherClient';
import { StorageClient } from '../../serviceClients/storageClient';
import { ITaskId } from '../interfaces';

@injectable()
export class TasksManager {
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    private readonly db: StorageClient,
    private readonly publisher: PublisherClient
  ) {}

  public async taskComplete(taskId: ITaskId): Promise<void> {
    this.logger.log('info', `checking tiling status of layer ${taskId.id} version  ${taskId.version}`);
    const res = await this.db.getCompletedZoomLevels(taskId);
    if (res.allCompleted) {
      this.logger.log('info', `publishing layer ${taskId.id} version  ${taskId.version} to server`);
      await this.publisher.publishLayer(taskId);
      this.logger.log('info', `publishing layer ${taskId.id} version  ${taskId.version} to catalog`);
      //TODO: add error handling logic in case publishing to catalog failed after publishing to map proxy
      await this.db.publishToCatalog(taskId);
    }
  }
}
