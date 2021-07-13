import config, { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { IngestionParams } from '@map-colonies/mc-model-types';
import { ILogger } from '../common/interfaces';
import { Services } from '../common/constants';
import { OperationStatus } from '../common/enums';
import { ICompletedTasks, ITaskZoomRange, ITillerRequest } from '../tasks/interfaces';
import { HttpClient, IHttpRetryConfig, parseConfig } from './clientsBase/httpClient';

interface ICreateTaskBody {
  description?: string;
  parameters: Record<string, unknown>;
  reason?: string;
  type?: string;
  status?: OperationStatus;
  attempts?: number;
}

interface ICreateJobBody {
  resourceId: string;
  version: string;
  parameters: Record<string, unknown>;
  type: string;
  description?: string;
  status?: OperationStatus;
  reason?: string;
  tasks?: ICreateTaskBody[];
}

interface ICreateJobResponse {
  id: string;
  taskIds: string[];
}

interface IGetTaskResponse {
  id: string;
  jobId: string;
  description?: string;
  parameters?: Record<string, unknown>;
  created: Date;
  updated: Date;
  status: OperationStatus;
  percentage?: number;
  reason?: string;
  attempts: number;
}

interface IGetJobResponse {
  id: string;
  resourceId?: string;
  version?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  reason?: string;
  tasks?: IGetTaskResponse[];
  created: Date;
  updated: Date;
  status?: OperationStatus;
  percentage?: number;
  isCleaned: boolean;
}

const jobType = config.get<string>('jobType');
const taskType = config.get<string>('taskType');
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

  public async createLayerTasks(data: IngestionParams, zoomRanges: ITaskZoomRange[]): Promise<void> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const fileNames = data.fileNames;
    const originDirectory = data.originDirectory;
    const createLayerTasksUrl = `/jobs`;
    const createJobRequest: ICreateJobBody = {
      resourceId: resourceId,
      version: version,
      type: jobType,
      parameters: (data as unknown) as Record<string, unknown>,
      tasks: zoomRanges.map((range) => {
        return {
          type: taskType,
          parameters: {
            discreteId: resourceId,
            version: version,
            fileNames: fileNames,
            originDirectory: originDirectory,
            minZoom: range.minZoom,
            maxZoom: range.maxZoom,
          },
        };
      }),
    };

    await this.post<ICreateJobResponse>(createLayerTasksUrl, createJobRequest);
  }

  public async getCompletedZoomLevels(jobId: string): Promise<ICompletedTasks> {
    const getJobUrl = `/jobs/${jobId}`;
    const res = await this.get<IGetJobResponse>(getJobUrl);
    let completedCounter = 0;
    let failedCounter = 0;
    res.tasks?.forEach((task) => {
      switch (task.status) {
        case OperationStatus.COMPLETED:
          completedCounter++;
          break;
        case OperationStatus.FAILED:
          failedCounter++;
          break;
        default:
      }
    });
    return {
      completed: completedCounter + failedCounter == (res.tasks?.length ?? 0),
      successful: failedCounter < (res.tasks?.length ?? 0),
      metadata: ((res.parameters as unknown) as IngestionParams).metadata,
    };
  }

  public async updateJobStatus(jobId: string, status: OperationStatus, reason?: string): Promise<void> {
    const updateTaskUrl = `/jobs/${jobId}`;
    await this.put(updateTaskUrl, {
      status: status,
      reason: reason,
    });
  }

  public async findJobs(resourceId: string, version: string): Promise<IGetJobResponse[]> {
    const getLayerUrl = `/jobs`;
    const res = await this.get<IGetJobResponse[]>(getLayerUrl, { resourceId, version, type: jobType });
    if (typeof res === 'string' || res.length === 0) {
      return [];
    }
    return res;
  }
}
