import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { ILogger } from '../common/interfaces';
import { IPublishMapLayerRequest } from '../layers/interfaces';
import { HttpClient } from './clientsBase/httpClient';

@injectable()
export class MapPublisherClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    super(logger);
    this.targetService = 'LayerPublisher'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('publishingServiceURL');
  }

  public async publishLayer(publishReq: IPublishMapLayerRequest): Promise<IPublishMapLayerRequest> {
    const saveMetadataUrl = '/publish';
    return this.post(saveMetadataUrl, publishReq);
  }
}
