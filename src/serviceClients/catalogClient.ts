import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { IConfig, ILogger } from '../common/interfaces';
import { HttpClient, IHttpRetryConfig, parseConfig } from './clientsBase/httpClient';

@injectable()
export class CatalogClient extends HttpClient {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    const retryConfig = parseConfig(config.get<IHttpRetryConfig>('httpRetry'));
    super(logger, retryConfig);
    this.targetService = 'Catalog'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('storageServiceURL');
  }

  public async exists(resourceId: string, version: string): Promise<boolean> {
    //TODO: integrate with catalog
    return Promise.resolve(false);
  }
}
