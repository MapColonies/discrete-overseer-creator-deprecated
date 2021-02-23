import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { IConfig, ILogger } from '../common/interfaces';
import { ITaskId } from '../tasks/interfaces';
import { HttpClient } from './clientsBase/httpClient';

@injectable()
export class CatalogClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    super(logger);
    this.targetService = 'Catalog'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('storageServiceURL');
  }

  public async exists(id: ITaskId): Promise<boolean> {
    //TODO: integrate with catalog
    return Promise.resolve(false);
  }
}
