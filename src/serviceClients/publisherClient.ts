import { IConfig } from 'config';
import { injectable } from 'tsyringe';
import { ILogger } from '../common/interfaces';
import { HttpClient } from './clientsBase/httpClient';

@injectable()
export class PublisherClient extends HttpClient {
  public constructor(protected readonly logger: ILogger, config: IConfig) {
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
