import { IRasterCatalogUpsertRequestBody, LayerMetadata } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { FindRecordResponse, IConfig, IFindResponseRecord, ILogger, IUpdateRecordResponse } from '../common/interfaces';
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

  public async findRecord(productId: string, productVersion: string, productType: string): Promise<IFindResponseRecord | undefined> {
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
    return res[0];
  }

  public async getLayerVersions(productId: string, productType: string): Promise<number[] | undefined> {
    const req = {
      metadata: {
        productId,
        productType,
      },
    };
    const res = await this.post<string[]>('/records/find/versions', req);
    const layerVersions = res.map((str) => {
      return Number(str);
    });

    return layerVersions;
  }

  public async publish(record: IRasterCatalogUpsertRequestBody): Promise<string> {
    const res = await this.post<ICreateRecordResponse>('/records', record);
    return res.id;
  }

  public async update(id: string, metadata: LayerMetadata): Promise<IUpdateRecordResponse> {
    const req = {
      metadata,
    };
    const res = await this.put<IUpdateRecordResponse>(`/records/${id}`, req);
    return res;
  }

  public async getHighestLayerVersion(productId: string, productType: string): Promise<number | undefined> {
    const existsLayerVersions = await this.getLayerVersions(productId, productType);
    if ((Array.isArray(existsLayerVersions) && existsLayerVersions.length > 0)) {
      const highestExistsLayerVersion = Math.max(...existsLayerVersions);
      return highestExistsLayerVersion;
    }
    return undefined;
  }
}
