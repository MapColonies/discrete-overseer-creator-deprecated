import config from 'config';
import { GeoJSON } from 'geojson';
import isValidGeoJson  from '@turf/boolean-valid';
import { Geometry } from '@turf/turf';
import { IngestionParams, ProductType } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { JobAction, OperationStatus, TaskAction } from '../../common/enums';
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
import { Grid } from '../interfaces';
import { getGrids, getExtents } from '../../utils/gpkg';
import { layerMetadataToPolygonParts } from '../../common/utills/polygonPartsBuilder';
import { FileValidator } from './fileValidator';
import { SplitTilesTasker } from './splitTilesTasker';

@injectable()
export class LayersManager {
  private readonly tileSplitTask: string;
  private readonly tileMergeTask: string;
  private grids: Grid[] = [];

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
    const originDirectory = data.originDirectory;
    const files = data.fileNames;
    const polygon = data.metadata.footprint as Geometry;
    if(!isValidGeoJson(polygon)){
      throw new BadRequestError(`received invalid footprint`);
    }
    const extent = getExtents(polygon as GeoJSON);

    if (convertedData.id !== undefined) {
      throw new BadRequestError(`received invalid field id`);
    }
    await this.validateFiles(data);
    await this.validateJobNotRunning(resourceId, productType);

    const jobType = await this.getJobType(data);
    const taskType = this.getTaskType(jobType, files, originDirectory);

    const existsInMapProxy = await this.isExistsInMapProxy(resourceId, productType);

    this.logger.log('info', `creating ${jobType} job and ${taskType} tasks for layer ${data.metadata.productId as string} type: ${productType}`);

    if (jobType === JobAction.NEW) {
      await this.validateNotExistsInCatalog(resourceId, version, productType);
      if (existsInMapProxy) {
        throw new ConflictError(`layer '${resourceId}-${productType}', is already exists on MapProxy`);
      }

      this.setDefaultValues(data);

      if (taskType === TaskAction.MERGE_TILES) {
        await this.mergeTilesTasker.createMergeTilesTasks(data, layerRelativePath, taskType, jobType, this.grids, extent);
      } else {
        const layerZoomRanges = this.zoomLevelCalculator.createLayerZoomRanges(data.metadata.maxResolutionDeg as number);
        await this.splitTilesTasker.createSplitTilesTasks(data, layerRelativePath, layerZoomRanges, jobType, taskType);
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (jobType === JobAction.UPDATE) {
      if (!existsInMapProxy) {
        throw new BadRequestError(`layer '${resourceId}-${productType}', is not exists on MapProxy`);
      }

      await this.mergeTilesTasker.createMergeTilesTasks(data, layerRelativePath, taskType, jobType, this.grids, extent);
    } else {
      throw new BadRequestError('Unsupported job type');
    }
  }

  private async getJobType(data: IngestionParams): Promise<JobAction> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const productType = data.metadata.productType as ProductType;
    const existsLayerVersions = await this.catalog.getLayerVersions(resourceId, productType);

    if (!(Array.isArray(existsLayerVersions) && existsLayerVersions.length > 0)) {
      return JobAction.NEW;
    }
    const highestExistsLayerVersion = Math.max(...existsLayerVersions);
    const requestedLayerVersion = parseFloat(version);
    if (requestedLayerVersion > highestExistsLayerVersion) {
      return JobAction.UPDATE;
    }
    throw new BadRequestError(
      `layer id: ${resourceId} version: ${version} product type: ${productType} has already the same or higher version (${highestExistsLayerVersion}) in catalog`
    );
  }

  private getTaskType(jobType: JobAction, files: string[], originDirectory: string): string {
    const validGpkgFiles = this.fileValidator.validateGpkgFiles(files, originDirectory);
    if (validGpkgFiles) {
      this.grids = getGrids(files, originDirectory);
    }

    if (jobType === JobAction.NEW) {
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

  private async isExistsInMapProxy(productId: string, productType: ProductType): Promise<boolean> {
    const layerName = getMapServingLayerName(productId, productType);
    const existsInMapServer = await this.mapPublisher.exists(layerName);
    return existsInMapServer;
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
