import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { ILogger } from '../../common/interfaces';
import { PublisherClient } from '../../serviceClients/publisherClient';
import { StorageClient, TaskState } from '../../serviceClients/storageClient';
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
    if (res.completed) {
      if (res.successful) {
        //TODO: add retries
        await this.publishToServer(taskId);
        await this.publishToCatalog(taskId);
        await this.db.updateTaskStatus(taskId, TaskState.COMPLETED);
      } else {
        this.logger.log(
          'error',
          `failed generating tiles for layer ${taskId.id} version  ${taskId.version}. please check discrete worker logs from more info`
        );
        await this.db.updateTaskStatus(taskId, TaskState.FAILED, 'Failed to generate tiles');
      }
    }
  }

  private async publishToCatalog(taskId: ITaskId): Promise<void> {
    try {
      this.logger.log('info', `publishing layer ${taskId.id} version  ${taskId.version} to catalog`);
      //TODO: add publish to catalog step
      //await this.db.publishToCatalog(taskId);
    } catch (err) {
      await this.db.updateTaskStatus(taskId, TaskState.FAILED, 'Failed to publish layer to catalog');
      //TODO: add error handling logic in case publishing to catalog failed after publishing to map proxy
      throw err;
    }
  }

  private async publishToServer(taskId: ITaskId): Promise<void> {
    try {
      this.logger.log('info', `publishing layer ${taskId.id} version  ${taskId.version} to server`);
      await this.publisher.publishLayer(taskId);
    } catch (err) {
      await this.db.updateTaskStatus(taskId, TaskState.FAILED, 'Failed to publish layer');
      //TODO: add error handling logic in case publishing to catalog failed after publishing to map proxy
      throw err;
    }
  }
}
