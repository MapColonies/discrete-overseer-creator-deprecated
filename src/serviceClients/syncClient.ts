import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { ILogger } from '../common/interfaces';
import { Services } from '../common/constants';
import { HttpClient, IHttpRetryConfig, parseConfig } from './clientsBase/httpClient';

export interface ISyncClientRequest {
  resourceId: string;
  version: string;
  operation: OperationTypeEnum;
  sourceType?: SyncTypeEnum;
  layerRelativePath: string;
}

export enum SyncTypeEnum {
  NEW_DISCRETE = 'NEW_DISCRETE',
  UPDATED_DISCRETE = 'UPDATED_DISCRETE',
}

export enum OperationTypeEnum {
  ADD = 'ADD',
  UPDATE = 'UPDATE',
  REMOVE = 'REMOVE',
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

  public async triggerSync(
    resourceId: string,
    version: string,
    syncType: SyncTypeEnum,
    operation: OperationTypeEnum,
    layerRelativePath: string
  ): Promise<void> {
    this.logger.log('info', `[SyncClient][triggerSync] resourceId=${resourceId}, version=${version}, syncType=${syncType}`);
    const createSyncRequest: ISyncClientRequest = {
      resourceId: resourceId,
      version: version,
      sourceType: syncType,
      operation: operation,
      layerRelativePath,
    };
    await this.post(`/synchronize/trigger`, createSyncRequest);
  }
}
