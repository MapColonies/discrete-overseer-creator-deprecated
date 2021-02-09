import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { ILogger } from '../common/interfaces';
import { Services } from '../common/constants';
import { ICompletedTasks, ITaskId } from '../tasks/interfaces';
import { HttpClient } from './clientsBase/httpClient';

@injectable()
export class StorageClient extends HttpClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    super(logger);
    this.targetService = 'CatalogDb'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('storageServiceURL');
  }

  public async saveMetadata(metadata: LayerMetadata): Promise<void> {
    const saveMetadataUrl = '/metadata';
    await this.post(saveMetadataUrl, metadata);
  }

  //TODO: replace return type with model
  public async getCompletedZoomLevels(taskId: ITaskId): Promise<ICompletedTasks> {
    const getCompletedZoomLevelsUrl = '/completedZoom';
    const data = await this.get<ICompletedTasks>(`${getCompletedZoomLevelsUrl}/${taskId.id}/${taskId.version}`);
    return data;
  }

  public async publishToCatalog(taskId: ITaskId): Promise<void> {
    const publishToCatalogUrl = '/publish';
    await this.post(`${publishToCatalogUrl}/${taskId.id}/${taskId.version}`);
  }
}
