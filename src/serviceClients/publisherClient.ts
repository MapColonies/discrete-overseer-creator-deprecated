import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { ILogger } from '../common/interfaces';
import { HttpClient } from './clientsBase/httpClient';

@injectable()
export class PublisherClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    super(logger);
    this.targetService = 'LayerPublisher'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('publishingServiceURL');
  }

  //TODO: modify to match model
  public async publishLayer(layerName: string, layerSourceUrl: string): Promise<void> {
    const saveMetadataUrl = '/publish';
    const data = {
      layerName: layerName,
      layerSourceUrl: layerSourceUrl,
    };
    await this.post(saveMetadataUrl, data);
  }
}
