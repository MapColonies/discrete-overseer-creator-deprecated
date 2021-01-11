import { IConfig } from 'config';
import { injectable } from 'tsyringe';
import { ILogger } from '../common/interfaces';
import { HttpClient } from './clientsBase/httpClient';

@injectable()
export class StorageClient extends HttpClient {
  public constructor(protected readonly logger: ILogger, config: IConfig) {
    super(logger);
    this.targetService = 'CatalogDb'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('storageServiceURL');
  }

  //TODO: replace metadata type with type from models
  public async saveMetadata(taskId: string, metadata: unknown): Promise<void> {
    const saveMetadataUrl = '/metadata';
    const data = {
      taskId: taskId,
      metadata: metadata,
    };
    await this.post(saveMetadataUrl, data);
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
