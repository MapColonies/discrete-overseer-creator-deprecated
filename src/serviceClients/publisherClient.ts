import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { ILogger } from '../common/interfaces';
import { ITaskId } from '../tasks/interfaces';
import { HttpClient } from './clientsBase/httpClient';

@injectable()
export class MapPublisherClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    super(logger);
    this.targetService = 'LayerPublisher'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('publishingServiceURL');
  }

  //TODO: modify to match model
  public async publishLayer(taskId: ITaskId): Promise<void> {
    const saveMetadataUrl = '/publish';
    await this.post(saveMetadataUrl, taskId);
  }
}
