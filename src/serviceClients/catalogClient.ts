import { IRasterCatalogUpsertRequestBody } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { IConfig, ILogger } from '../common/interfaces';
import { HttpClient, IHttpRetryConfig, parseConfig } from './clientsBase/httpClient';

interface IFindResponseRecord extends IRasterCatalogUpsertRequestBody {
  id: string;
}

type FindRecordResponse = IFindResponseRecord[];
@injectable()
export class CatalogClient extends HttpClient {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    const retryConfig = parseConfig(config.get<IHttpRetryConfig>('httpRetry'));
    super(logger, retryConfig);
    this.targetService = 'Catalog'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('catalogPublishingServiceURL');
  }

  public async exists(productId: string, productVersion: string): Promise<boolean> {
    const req = {
      metadata: {
        productId,
        productVersion,
      },
    };
    const res = await this.post<FindRecordResponse>('/records/find', req);

    return res.length > 0;
  }

  public async publish(record: IRasterCatalogUpsertRequestBody): Promise<void> {
    await this.post('/records', record);
  }
}
