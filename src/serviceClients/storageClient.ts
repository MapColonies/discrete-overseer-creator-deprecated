import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { ImageMetadata } from '@map-colonies/mc-model-types';
import { ILogger } from '../common/interfaces';
import { Services } from '../common/constants';
import { HttpClient } from './clientsBase/httpClient';

@injectable()
export class StorageClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    super(logger);
    this.targetService = 'CatalogDb'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('storageServiceURL');
  }

  public async saveMetadata(metadata: ImageMetadata): Promise<void> {
    const saveMetadataUrl = '/metadata';
    await this.post(saveMetadataUrl, metadata);
  }

  //TODO: replace return type with model
  public async getCompletedZoomLevels(taskId: string): Promise<unknown> {
    const getCompletedZoomLevelsUrl = '/completedZoom';
    const data = await this.get(`${getCompletedZoomLevelsUrl}/${taskId}`);
    return data;
  }

  public async publishToCatalog(taskId: string): Promise<void> {
    const publishToCatalogUrl = '/publish';
    await this.post(`${publishToCatalogUrl}/${taskId}`);
  }
}
