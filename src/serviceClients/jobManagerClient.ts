import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { IngestionParams, ProductType } from '@map-colonies/mc-model-types';
import { ILogger, IMergeTaskParams } from '../common/interfaces';
import { Services } from '../common/constants';
import { OperationStatus } from '../common/enums';
import { ICompletedTasks, IGetTaskResponse } from '../tasks/interfaces';
import { ITaskParameters } from '../layers/interfaces';
import { HttpClient, IHttpRetryConfig, parseConfig } from './clientsBase/httpClient';

interface ICreateTaskBody {
  description?: string;
  parameters: ITaskParameters | IMergeTaskParams;
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
  internalId?: string;
  producerName?: string;
  productName?: string;
  productType?: string;
}

interface ICreateJobResponse {
  id: string;
  taskIds: string[];
}

export interface IGetJobResponse {
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
  type: string;
  percentage?: number;
  isCleaned: boolean;
  internalId?: string;
  producerName?: string;
  productName?: string;
  productType?: string;
  taskCount: number;
  completedTasks: number;
  failedTasks: number;
  expiredTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  abortedTasks: number;
}

@injectable()
export class JobManagerClient extends HttpClient {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, @inject(Services.CONFIG) config: IConfig) {
    const retryConfig = parseConfig(config.get<IHttpRetryConfig>('httpRetry'));
    super(logger, retryConfig);
    this.targetService = 'DiscreteIngestionDB'; //name of target for logs
    this.axiosOptions.baseURL = config.get<string>('jobManagerURL');
  }

  public async createLayerJob(
    data: IngestionParams,
    catalogId: string,
    layerRelativePath: string,
    jobType: string,
    taskType: string,
    taskParams?: (ITaskParameters | IMergeTaskParams)[]
  ): Promise<string> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const displayPath = data.metadata.displayPath as string;
    const createLayerTasksUrl = `/jobs`;
    const createJobRequest: ICreateJobBody = {
      resourceId: resourceId,
      internalId: catalogId,
      version: version,
      type: jobType,
      status: OperationStatus.IN_PROGRESS,
      parameters: { ...data, layerRelativePath, displayPath } as unknown as Record<string, unknown>,
      producerName: data.metadata.producerName,
      productName: data.metadata.productName,
      productType: data.metadata.productType,
      tasks: taskParams?.map((params) => {
        return {
          type: taskType,
          parameters: params,
        };
      }),
    };

    const res = await this.post<ICreateJobResponse>(createLayerTasksUrl, createJobRequest);
    return res.id;
  }

  public async createTasks(jobId: string, taskParams: ITaskParameters[] | IMergeTaskParams[], taskType: string): Promise<void> {
    const createTasksUrl = `/jobs/${jobId}/tasks`;
    const parmas = taskParams as unknown as (IMergeTaskParams | IMergeTaskParams)[];
    const req = parmas.map((params) => {
      return {
        type: taskType,
        parameters: params,
      };
    });
    await this.post(createTasksUrl, req);
  }

  public async getJobStatus(jobId: string): Promise<ICompletedTasks> {
    const getJobUrl = `/jobs/${jobId}`;
    const query = {
      shouldReturnTasks: false,
    };
    const res = await this.get<IGetJobResponse>(getJobUrl, query);
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const jobPercentage = Math.trunc((res.completedTasks / res.taskCount) * 100);
    return {
      id: res.id,
      internalId: res.internalId as string,
      status: res.status as OperationStatus,
      isCompleted: res.completedTasks + res.failedTasks + res.expiredTasks + res.abortedTasks === res.taskCount,
      isSuccessful: res.completedTasks === res.taskCount,
      percentage: jobPercentage,
      metadata: (res.parameters as unknown as IngestionParams).metadata,
      relativePath: (res.parameters as unknown as { layerRelativePath: string }).layerRelativePath,
      successTasksCount: res.completedTasks,
      type: res.type,
    };
  }

  public async getTask(jobId: string, taskId: string): Promise<IGetTaskResponse> {
    const getTaskUrl = `/jobs/${jobId}/tasks/${taskId}`;
    const res = await this.get<IGetTaskResponse>(getTaskUrl);
    return res;
  }

  public async updateJobStatus(jobId: string, status: OperationStatus, jobPercentage?: number, reason?: string, catalogId?: string): Promise<void> {
    const updateTaskUrl = `/jobs/${jobId}`;
    await this.put(updateTaskUrl, {
      status: status,
      reason: reason,
      internalId: catalogId,
      percentage: jobPercentage,
    });
  }

  public async findJobs(resourceId: string, productType: ProductType): Promise<IGetJobResponse[]> {
    const getLayerUrl = `/jobs`;
    const res = await this.get<IGetJobResponse[]>(getLayerUrl, { resourceId, productType: productType, shouldReturnTasks: false });
    if (typeof res === 'string' || res.length === 0) {
      return [];
    }
    return res;
  }

  public async findJobsByInternalId(internalId: string): Promise<IGetJobResponse[]> {
    const getLayerUrl = `/jobs`;
    const res = await this.get<IGetJobResponse[]>(getLayerUrl, { internalId, shouldReturnTasks: false });
    if (typeof res === 'string' || res.length === 0) {
      return [];
    }

    return res;
  }

  public async abortJob(jobId: string): Promise<void> {
    const abortJobUrl = `/tasks/abort/${jobId}`;
    await this.post(abortJobUrl);
  }
}
