import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { ILogger } from '../common/interfaces';
import { Services } from '../common/constants';
import { HttpClient, IHttpRetryConfig, parseConfig } from './clientsBase/httpClient';

interface ISyncClientRequest {
  resourceId: string;
  version: string;
  type?: string;
}

export enum SyncTypeEnum {
  NEW_DISCRETE = 'NEW_DISCRETE',
  UPDATED_DISCRETE = 'UPDATED_DISCRETE',
}

@injectable()
export class SyncClient extends HttpClient {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    const retryConfig = parseConfig(config.get<IHttpRetryConfig>('httpRetry'));
    super(logger, retryConfig);
    this.targetService = 'Synchronization'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('syncServiceURL');
  }

  public async triggerSync(resourceId: string, version: string, syncType: SyncTypeEnum): Promise<void> {
    this.logger.log('info', `[SyncClient][triggerSync] resourceId=${resourceId}, version=${version}, syncType=${syncType}`);
    const createSyncRequest: ISyncClientRequest = {
      resourceId: resourceId,
      version: version,
      type: syncType,
    };
    await this.post<ISyncClientRequest>(`/`, createSyncRequest);
  }
}
