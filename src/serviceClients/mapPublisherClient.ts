import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { NotFoundError } from '../common/exceptions/http/notFoundError';
import { ILogger } from '../common/interfaces';
import { IPublishMapLayerRequest } from '../layers/interfaces';
import { HttpClient } from './clientsBase/httpClient';

@injectable()
export class MapPublisherClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    super(logger);
    this.targetService = 'LayerPublisher'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('mapPublishingServiceURL');
  }

  public async publishLayer(publishReq: IPublishMapLayerRequest): Promise<IPublishMapLayerRequest> {
    const saveMetadataUrl = '/layer';
    return this.post(saveMetadataUrl, publishReq);
  }

  public async exists(name: string): Promise<boolean> {
    const saveMetadataUrl = `/layer/${name}`;
    try {
      await this.get(saveMetadataUrl);
      return true;
    } catch (err) {
      if (err instanceof NotFoundError) {
        return false;
      } else {
        throw err;
      }
    }
  }
}
