import { inject, injectable } from 'tsyringe';
import XmlBuilder from 'xmlbuilder';
import { Services } from '../../common/constants';
import { IConfig, ILogger } from '../../common/interfaces';
import { CatalogClient } from '../../serviceClients/catalogClient';
import { ITocParams, TocOperation } from '../interfaces';
import { NotFoundError } from '../../common/exceptions/http/notFoundError';

@injectable()
export class TocManager {
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly client: CatalogClient
  ) {}

  public async getXmlLayerToc(params: ITocParams): Promise<string> {
    const toc = await this.getTocObject(params);
    const xmlString = XmlBuilder.create(toc, { version: '1.0', encoding: 'UTF-8' }).end({ pretty: true });
    return xmlString;
  }

  public async getJsonStringLayerToc(params: ITocParams): Promise<string> {
    const toc = await this.getTocObject(params);
    return JSON.stringify(toc);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private async getTocObject(params: ITocParams): Promise<Record<string, Object>> {
    let metadata = {};

    if (params.operation != TocOperation.REMOVE) {
      // Get metadata
      const data = await this.client.getMetadata(params.productId, params.productVersion, params.productType);
      if (data === undefined) {
        throw new NotFoundError(
          `Wanted productType: ${params.productType} does not exist. id: ${params.productId}, version: ${params.productVersion}`
        );
      }
      metadata = data;
    } else {
      metadata = {
        productId: params.productId,
        productVersion: params.productVersion,
      };
    }

    return {
      operation: params.operation,
      productType: params.productType,
      metadata,
    };
  }
}
