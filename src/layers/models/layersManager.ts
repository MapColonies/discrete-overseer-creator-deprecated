import { IngestionParams, ProductType } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { GeoJSON } from 'geojson';
import { Services } from '../../common/constants';
import { JobType, OperationStatus, TaskType } from '../../common/enums';
import { BadRequestError } from '../../common/exceptions/http/badRequestError';
import { ConflictError } from '../../common/exceptions/http/conflictError';
import { IConfig, ILogger } from '../../common/interfaces';
import { layerMetadataToPolygonParts } from '../../common/utills/polygonPartsBuilder';
import { CatalogClient } from '../../serviceClients/catalogClient';
import { MapPublisherClient } from '../../serviceClients/mapPublisherClient';
import { JobManagerClient } from '../../serviceClients/jobManagerClient';
import { ZoomLevelCalculator } from '../../utils/zoomToResolution';
import { getMapServingLayerName } from '../../utils/layerNameGenerator';
import { createBBoxString } from '../../utils/bbox';
import { ITaskZoomRange } from '../../tasks/interfaces';
import { ITaskParameters } from '../interfaces';
import { FileValidator } from './fileValidator';
import { Tasker } from './tasker';

@injectable()
export class LayersManager {
  private readonly tasksBatchSize: number;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    @inject(Services.CONFIG) config: IConfig,
    private readonly zoomLevelCalculator: ZoomLevelCalculator,
    private readonly db: JobManagerClient,
    private readonly catalog: CatalogClient,
    private readonly mapPublisher: MapPublisherClient,
    private readonly fileValidator: FileValidator,
    private readonly tasker: Tasker
  ) {
    this.tasksBatchSize = config.get<number>('tasksBatchSize');
  }

  public async createLayer(data: IngestionParams): Promise<void> {
    const convertedData: Record<string, unknown> = data.metadata as unknown as Record<string, unknown>;
    if (convertedData.id !== undefined) {
      throw new BadRequestError(`received invalid field id`);
    }
    const isUpdateJob = await this.checkForUpdate(data);
    await this.validateRunConditions(data, isUpdateJob);
    data.metadata.srsId = data.metadata.srsId === undefined ? '4326' : data.metadata.srsId;
    data.metadata.srsName = data.metadata.srsName === undefined ? 'WGS84GEO' : data.metadata.srsName;
    data.metadata.productBoundingBox = createBBoxString(data.metadata.footprint as GeoJSON);
    if (!data.metadata.layerPolygonParts) {
      data.metadata.layerPolygonParts = layerMetadataToPolygonParts(data.metadata);
    }
    this.logger.log('info', `creating job and tasks for layer ${data.metadata.productId as string}`);
    const layerRelativePath = `${data.metadata.productId as string}/${data.metadata.productType as string}`;
    const layerZoomRanges = this.zoomLevelCalculator.createLayerZoomRanges(data.metadata.maxResolutionDeg as number);
    await this.createTasks(data, layerRelativePath, layerZoomRanges, isUpdateJob);
  }

  public async checkForUpdate(data: IngestionParams): Promise<boolean> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const productType = data.metadata.productType as ProductType;

    const existsLayerVersions = await this.catalog.getLayerVersions(resourceId, productType);
    if (existsLayerVersions) {
      const highestExistsProductVersion = Math.max(...existsLayerVersions);
      const requestedLayerVersion = parseFloat(version);
      if (requestedLayerVersion > highestExistsProductVersion) {
        return true;
      } else {
        throw new BadRequestError(`layer id: ${resourceId} version: ${version} product type: ${productType} has already higher version in catalog`);
      }
    }
    return false;
  }

  private async createTasks(
    data: IngestionParams,
    layerRelativePath: string,
    layerZoomRanges: ITaskZoomRange[],
    isUpdateJob: boolean
  ): Promise<void> {
    if (isUpdateJob) {
      console.log('creating update task');
    }
    const taskParams = this.tasker.generateTasksParameters(data, layerRelativePath, layerZoomRanges);
    let taskBatch: ITaskParameters[] = [];
    let jobId: string | undefined = undefined;
    for (const task of taskParams) {
      taskBatch.push(task);
      if (taskBatch.length === this.tasksBatchSize) {
        if (jobId === undefined) {
          jobId = await this.db.createLayerJob(data, layerRelativePath, isUpdateJob, taskBatch);
        } else {
          // eslint-disable-next-line no-useless-catch
          try {
            await this.db.createTasks(jobId, taskBatch, isUpdateJob);
          } catch (err) {
            //TODO: properly handle errors
            await this.db.updateJobStatus(jobId, OperationStatus.FAILED);
            throw err;
          }
        }
        taskBatch = [];
      }
    }
    if (taskBatch.length !== 0) {
      if (jobId === undefined) {
        jobId = await this.db.createLayerJob(data, layerRelativePath, isUpdateJob, taskBatch);
      } else {
        // eslint-disable-next-line no-useless-catch
        try {
          await this.db.createTasks(jobId, taskBatch, isUpdateJob);
        } catch (err) {
          //TODO: properly handle errors
          await this.db.updateJobStatus(jobId, OperationStatus.FAILED);
          throw err;
        }
      }
    }
  }

  private async validateRunConditions(data: IngestionParams, isUpdateJob: boolean): Promise<void> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const productType = data.metadata.productType as ProductType;
    const jobType = isUpdateJob ? JobType.UPDATE : JobType.DISCRETE_TILING;

    await this.validateNotRunning(resourceId, version, productType, jobType);
    await this.validateNotExistsInCatalog(resourceId, version, productType);
    await this.validateFiles(data, isUpdateJob);
    await this.validateNotExistsInMapServer(resourceId, productType);
  }

  private async validateFiles(data: IngestionParams, isUpdateJob: boolean): Promise<void> {
    // const filesExists = await this.fileValidator.validateExists(data.originDirectory, data.fileNames);
    // if (!filesExists) {
    //   throw new BadRequestError('invalid files list, some files are missing');
    // }
    if (isUpdateJob) {
      const gpkgFiles = await this.fileValidator.validateGpkgFiles(data.originDirectory, data.fileNames);
      if (!gpkgFiles) {
        throw new BadRequestError('Invalid files list, some files are not includes "gpkg" extension');
      }
    }
  }

  private async validateNotExistsInMapServer(productId: string, productType: ProductType): Promise<void> {
    const layerName = getMapServingLayerName(productId, productType);
    const existsInMapServer = await this.mapPublisher.exists(layerName);
    if (existsInMapServer) {
      throw new ConflictError(`layer ${layerName}, already exists on mapProxy`);
    }
  }

  private async validateNotRunning(resourceId: string, version: string, productType: ProductType, jobType: JobType): Promise<void> {
    const jobs = await this.db.findJobs(resourceId, version, productType, jobType);
    jobs.forEach((job) => {
      if (job.status == OperationStatus.IN_PROGRESS || job.status == OperationStatus.PENDING) {
        throw new ConflictError(`layer id: ${resourceId} version: ${version} product type: ${productType}, generation is already running`);
      }
    });
  }

  private async validateNotExistsInCatalog(resourceId: string, version?: string, productType?: string): Promise<void> {
    const existsInCatalog = await this.catalog.exists(resourceId, version, productType);
    if (existsInCatalog) {
      throw new ConflictError(`layer id: ${resourceId} version: ${version as string}, already exists in catalog`);
    }
  }
}
