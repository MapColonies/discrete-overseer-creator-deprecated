import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { ILogger } from '../common/interfaces';
import { Services } from '../common/constants';
import { ICompletedTasks, ITaskId, ITaskZoomRange, ITillerRequest } from '../tasks/interfaces';
import { NotFoundError } from '../common/exceptions/http/notFoundError';
import { HttpClient, IHttpRetryConfig, parseConfig } from './clientsBase/httpClient';

//TODO: replace with model
enum TaskState {
  PENDING = 'Pending',
  IN_PROGRESS = 'In-Progress',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
}

interface ITaskStatus {
  taskId: string;
  updateDate: string;
  status: TaskState;
  reason: string;
  attempts: number;
  minZoom: number;
  maxZoom: number;
}

interface IDiscreteData {
  id: string;
  version: string;
  updateDate: string;
  tasks: ITaskStatus[];
  metadata: LayerMetadata;
  status: TaskState;
  reason: string;
}
@injectable()
export class StorageClient extends HttpClient {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    const retryConfig = parseConfig(config.get<IHttpRetryConfig>('httpRetry'));
    super(logger, retryConfig);
    this.targetService = 'DiscreteIngestionDB'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('storageServiceURL');
  }

  public async createLayerTasks(metadata: LayerMetadata, zoomRanges: ITaskZoomRange[]): Promise<ITillerRequest[]> {
    const id = metadata.id as string;
    const version = metadata.version as string;
    const createLayerTasksUrl = `/discrete/${id}/${version}`;
    const body = {
      metadata: metadata,
      tasks: zoomRanges,
    };
    try {
      const res = await this.post<string[]>(createLayerTasksUrl, body);
      const tasks = res.map((taskId, idx) => {
        const tillerReq: ITillerRequest = {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: id,
          version: version,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: taskId,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: zoomRanges[idx].minZoom,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: zoomRanges[idx].maxZoom,
        };
        return tillerReq;
      });
      return tasks;
    } catch (err) {
      //TODO: add error handling
      const error = err as Error;
      this.logger.log('error', error.message);
      throw err;
    }
  }

  public async getCompletedZoomLevels(taskId: ITaskId): Promise<ICompletedTasks> {
    const getCompletedZoomLevelsUrl = `/discrete/${taskId.id}/${taskId.version}`;
    const res = await this.get<IDiscreteData>(getCompletedZoomLevelsUrl);
    let completedCounter = 0;
    let failedCounter = 0;
    res.tasks.forEach((task) => {
      switch (task.status) {
        case TaskState.COMPLETED:
          completedCounter++;
          break;
        case TaskState.FAILED:
          failedCounter++;
          break;
        default:
      }
    });
    return {
      completed: completedCounter + failedCounter == res.tasks.length,
      successful: failedCounter < res.tasks.length,
      metaData: res.metadata,
    };
  }

  public async updateTaskStatus(taskId: ITaskId, status: TaskState, reason?: string): Promise<void> {
    const updateTaskUrl = `/discrete/${taskId.id}/${taskId.version}`;
    await this.put(updateTaskUrl, {
      status: status,
      reason: reason,
    });
  }

  public async getLayerStatus(taskId: ITaskId): Promise<TaskState | undefined> {
    const getLayerUrl = `/discrete/${taskId.id}/${taskId.version}`;
    try {
      const res = await this.get<IDiscreteData>(getLayerUrl);
      return res.status;
    } catch (err) {
      if (err instanceof NotFoundError) {
        return undefined;
      } else {
        throw err;
      }
    }
  }
}

export { TaskState };
