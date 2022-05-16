import { IngestionParams, ProductType } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { GeoJSON } from 'geojson';
import { Services } from '../../common/constants';
import { JobType, OperationStatus } from '../../common/enums';
import { BadRequestError } from '../../common/exceptions/http/badRequestError';
import { ConflictError } from '../../common/exceptions/http/conflictError';
import { ILogger } from '../../common/interfaces';
import { layerMetadataToPolygonParts } from '../../common/utills/polygonPartsBuilder';
import { CatalogClient } from '../../serviceClients/catalogClient';
import { MapPublisherClient } from '../../serviceClients/mapPublisherClient';
import { JobManagerClient } from '../../serviceClients/jobManagerClient';
import { ZoomLevelCalculator } from '../../utils/zoomToResolution';
import { getMapServingLayerName } from '../../utils/layerNameGenerator';
import { createBBoxString } from '../../utils/bbox';
import { ITaskZoomRange } from '../../tasks/interfaces';
import { MergeTasker } from '../../merge/mergeTasker';
import { FileValidator } from './fileValidator';
import { Tasker } from './tasker';

@injectable()
export class LayersManager {
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    private readonly zoomLevelCalculator: ZoomLevelCalculator,
    private readonly db: JobManagerClient,
    private readonly catalog: CatalogClient,
    private readonly mapPublisher: MapPublisherClient,
    private readonly fileValidator: FileValidator,
    private readonly tasker: Tasker,
    private readonly mergeTasker: MergeTasker
  ) {}

  public async createLayer(data: IngestionParams): Promise<void> {
    const convertedData: Record<string, unknown> = data.metadata as unknown as Record<string, unknown>;
    if (convertedData.id !== undefined) {
      throw new BadRequestError(`received invalid field id`);
    }
    const isUpdateJob = await this.checkForUpdate(data);
    const jobType = isUpdateJob ? JobType.UPDATE : JobType.DISCRETE_TILING;
    await this.validateRunConditions(data, jobType);
    data.metadata.srsId = data.metadata.srsId === undefined ? '4326' : data.metadata.srsId;
    data.metadata.srsName = data.metadata.srsName === undefined ? 'WGS84GEO' : data.metadata.srsName;
    data.metadata.productBoundingBox = createBBoxString(data.metadata.footprint as GeoJSON);
    if (!data.metadata.layerPolygonParts) {
      data.metadata.layerPolygonParts = layerMetadataToPolygonParts(data.metadata);
    }
    this.logger.log('info', `creating job and tasks for layer ${data.metadata.productId as string}`);
    const layerRelativePath = `${data.metadata.productId as string}/${data.metadata.productType as string}`;
    const layerZoomRanges = this.zoomLevelCalculator.createLayerZoomRanges(data.metadata.maxResolutionDeg as number);
    await this.createTasks(data, layerRelativePath, layerZoomRanges, jobType);
  }

  public async checkForUpdate(data: IngestionParams): Promise<boolean> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const productType = data.metadata.productType as ProductType;

    const existsLayerVersions = await this.catalog.getLayerVersions(resourceId, productType);

    if (existsLayerVersions) {
      const highestExistsProductVersion = Math.max(...existsLayerVersions);
      const requestedLayerVersion = parseFloat(version);
      if (!existsLayerVersions.length) {
        return false;
      }
      if (requestedLayerVersion > highestExistsProductVersion) {
        return true;
      } else {
        throw new BadRequestError(
          `layer id: ${resourceId} version: ${version} product type: ${productType} has already higher version (${highestExistsProductVersion}) in catalog`
        );
      }
    }
    return false;
  }

  private async createTasks(data: IngestionParams, layerRelativePath: string, layerZoomRanges: ITaskZoomRange[], jobType: JobType): Promise<void> {
    if (jobType === JobType.UPDATE) {
      const allValidGpkgs = await this.fileValidator.validateGpkgFiles(data.fileNames);
      if (!allValidGpkgs) {
        throw new BadRequestError('Some of the files are not supported yet. UPDATE operation support: [GPKG] files only');
      }
      await this.mergeTasker.createMergeTask(data, layerRelativePath, jobType);
    } else {
      await this.tasker.createIngestionTask(data, layerRelativePath, layerZoomRanges, jobType);
    }
  }

  private async validateRunConditions(data: IngestionParams, jobType: JobType): Promise<void> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const productType = data.metadata.productType as ProductType;

    await this.validateNotRunning(resourceId, version, productType, jobType);
    await this.validateNotExistsInCatalog(resourceId, version, productType);
    await this.validateFiles(data);
    await this.validateNotExistsInMapServer(resourceId, productType);
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
