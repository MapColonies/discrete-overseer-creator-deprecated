import { IRasterCatalogUpsertRequestBody, LayerMetadata } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { FindRecordResponse, IConfig, ILogger } from '../common/interfaces';
import { HttpClient, IHttpRetryConfig, parseConfig } from './clientsBase/httpClient';

interface ICreateRecordResponse {
  id: string;
  taskIds: string[];
}

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

  public async exists(productId: string, productVersion?: string, productType?: string): Promise<boolean> {
    const req = {
      metadata: {
        productId,
        productVersion,
        productType,
      },
    };
    const res = await this.post<FindRecordResponse>('/records/find', req);

    return res.length > 0;
  }

  public async getMetadata(productId: string, productVersion: string, productType: string): Promise<LayerMetadata | undefined> {
    const req = {
      metadata: {
        productId,
        productVersion,
        productType,
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

  public async getLayerVersions(productId: string, productType: string): Promise<LayerMetadata[] | undefined> {
    const req = {
      metadata: {
        productId,
        productType,
      },
    };
    const res = await this.post<FindRecordResponse>('/records/find/versions', req);
    console.log(res)
    return res.map((rec) => rec.metadata);
  }

  public async publish(record: IRasterCatalogUpsertRequestBody): Promise<string> {
    const res = await this.post<ICreateRecordResponse>('/records', record);
    return res.id;
  }
}
