import { IRasterCatalogUpsertRequestBody, LayerMetadata } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { FindRecordResponse, IConfig, ILogger } from '../common/interfaces';
import { HttpClient, IHttpRetryConfig, parseConfig } from './clientsBase/httpClient';

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

  public async getMetadata(productId: string, productVersion: string): Promise<LayerMetadata | undefined> {
    const req = {
      metadata: {
        productId,
        productVersion,
      },
    };

    // Get product information
    const res = await this.post<FindRecordResponse>('/records/find', req);

    // Check if product exists with given version
    if (res.length == 0) {
      return undefined;
    }

    // Return metadata
    return res[0].metadata;
  }

  public async publish(record: IRasterCatalogUpsertRequestBody): Promise<void> {
    await this.post('/records', record);
  }
}
