import config from 'config';
import { GeoJSON } from 'geojson';
import { IngestionParams, ProductType } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { JobType, OperationStatus } from '../../common/enums';
import { BadRequestError } from '../../common/exceptions/http/badRequestError';
import { ConflictError } from '../../common/exceptions/http/conflictError';
import { ILogger } from '../../common/interfaces';
import { CatalogClient } from '../../serviceClients/catalogClient';
import { MapPublisherClient } from '../../serviceClients/mapPublisherClient';
import { JobManagerClient } from '../../serviceClients/jobManagerClient';
import { ZoomLevelCalculator } from '../../utils/zoomToResolution';
import { getMapServingLayerName } from '../../utils/layerNameGenerator';
import { MergeTilesTasker } from '../../merge/mergeTilesTasker';
import { createBBoxString } from '../../utils/bbox';
import { layerMetadataToPolygonParts } from '../../common/utills/polygonPartsBuilder';
import { FileValidator } from './fileValidator';
import { SplitTilesTasker } from './splitTilesTasker';

@injectable()
export class LayersManager {
  private readonly tileSplitTask: string;
  private readonly tileMergeTask: string;
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    private readonly zoomLevelCalculator: ZoomLevelCalculator,
    private readonly db: JobManagerClient,
    private readonly catalog: CatalogClient,
    private readonly mapPublisher: MapPublisherClient,
    private readonly fileValidator: FileValidator,
    private readonly splitTilesTasker: SplitTilesTasker,
    private readonly mergeTilesTasker: MergeTilesTasker
  ) {
    this.tileSplitTask = config.get<string>('ingestionTaskType.tileSplitTask');
    this.tileMergeTask = config.get<string>('ingestionTaskType.tileMergeTask');
  }

  public async createLayer(data: IngestionParams): Promise<void> {
    const convertedData: Record<string, unknown> = data.metadata as unknown as Record<string, unknown>;
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const productType = data.metadata.productType as ProductType;
    const layerRelativePath = `${data.metadata.productId as string}/${data.metadata.productType as string}`;

    if (convertedData.id !== undefined) {
      throw new BadRequestError(`received invalid field id`);
    }
    const jobType = await this.getJobType(data);
    const taskType = this.getTaskType(jobType, data.fileNames);

    await this.validateFiles(data);
    await this.validateJobNotRunning(resourceId, productType);

    this.logger.log('info', `creating ${jobType} job and ${taskType} tasks for layer ${data.metadata.productId as string} type: ${productType}`);

    if (jobType === JobType.NEW) {
      await this.validateNotExistsInCatalog(resourceId, version, productType);
      await this.validateNotExistsInMapServer(resourceId, productType);
      const layerZoomRanges = this.zoomLevelCalculator.createLayerZoomRanges(data.metadata.maxResolutionDeg as number);

      this.setDefaultValues(data);

      await this.splitTilesTasker.createSplitTilesTasks(data, layerRelativePath, layerZoomRanges, jobType, taskType);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (jobType === JobType.UPDATE) {
      await this.validateExistsInMapServer(resourceId, productType);

      await this.mergeTilesTasker.createMergeTilesTasks(data, layerRelativePath, taskType);
    } else {
      throw new BadRequestError('Unsupported job type');
    }
  }

  private async getJobType(data: IngestionParams): Promise<JobType> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const productType = data.metadata.productType as ProductType;

    const existsLayerVersions = await this.catalog.getLayerVersions(resourceId, productType);

    if (!(Array.isArray(existsLayerVersions) && existsLayerVersions.length > 0)) {
      return JobType.NEW;
    }
    const highestExistsLayerVersion = Math.max(...existsLayerVersions);
    const requestedLayerVersion = parseFloat(version);
    if (requestedLayerVersion > highestExistsLayerVersion) {
      return JobType.UPDATE;
    }
    throw new BadRequestError(
      `layer id: ${resourceId} version: ${version} product type: ${productType} has already the same or higher version (${highestExistsLayerVersion}) in catalog`
    );
  }

  private getTaskType(jobType: JobType, files: string[]): string {
    const validGpkgFiles = this.fileValidator.validateGpkgFiles(files);

    if (jobType === JobType.NEW) {
      if (validGpkgFiles) {
        return this.tileMergeTask;
      } else {
        return this.tileSplitTask;
      }
    } else if (validGpkgFiles) {
      return this.tileMergeTask;
    } else {
      throw new BadRequestError(`Ingesion "Update" job type does not support Mixed/TIFF/TIF/J2k etc.. (GPKG support only)`);
    }
  }

  private async validateFiles(data: IngestionParams): Promise<void> {
    const filesExists = await this.fileValidator.validateExists(data.originDirectory, data.fileNames);
    if (!filesExists) {
      throw new BadRequestError('invalid files list, some files are missing');
    }
  }

  private async validateNotExistsInMapServer(productId: string, productType: ProductType): Promise<void> {
    const layerName = getMapServingLayerName(productId, productType);
    const existsInMapServer = await this.mapPublisher.exists(layerName);
    if (existsInMapServer) {
      throw new ConflictError(`layer ${layerName}, already exists on MapProxy`);
    }
  }

  private async validateExistsInMapServer(productId: string, productType: ProductType): Promise<void> {
    const layerName = getMapServingLayerName(productId, productType);
    const existsInMapServer = await this.mapPublisher.exists(layerName);
    if (!existsInMapServer) {
      throw new BadRequestError(`layer ${layerName}, is not exists on MapProxy`);
    }
  }

  private async validateJobNotRunning(resourceId: string, productType: ProductType): Promise<void> {
    const jobs = await this.db.findJobs(resourceId, productType);
    jobs.forEach((job) => {
      if (job.status == OperationStatus.IN_PROGRESS || job.status == OperationStatus.PENDING) {
        throw new ConflictError(`layer id: ${resourceId} product type: ${productType}, job is already running`);
      }
    });
  }

  private async validateNotExistsInCatalog(resourceId: string, version?: string, productType?: string): Promise<void> {
    const existsInCatalog = await this.catalog.exists(resourceId, version, productType);
    if (existsInCatalog) {
      throw new ConflictError(`layer id: ${resourceId} version: ${version as string}, already exists in catalog`);
    }
  }

  private setDefaultValues(data: IngestionParams): void {
    data.metadata.srsId = data.metadata.srsId === undefined ? '4326' : data.metadata.srsId;
    data.metadata.srsName = data.metadata.srsName === undefined ? 'WGS84GEO' : data.metadata.srsName;
    data.metadata.productBoundingBox = createBBoxString(data.metadata.footprint as GeoJSON);
    if (!data.metadata.layerPolygonParts) {
      data.metadata.layerPolygonParts = layerMetadataToPolygonParts(data.metadata);
    }
  }
}
