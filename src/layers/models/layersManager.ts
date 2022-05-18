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
import { MergeTilesTasker } from '../../merge/mergeTilesTasker';
import { FileValidator } from './fileValidator';
import { SplitTilesTasker } from './splitTilesTasker';

@injectable()
export class LayersManager {
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    private readonly zoomLevelCalculator: ZoomLevelCalculator,
    private readonly db: JobManagerClient,
    private readonly catalog: CatalogClient,
    private readonly mapPublisher: MapPublisherClient,
    private readonly fileValidator: FileValidator,
    private readonly splitTilesTasker: SplitTilesTasker,
    private readonly mergeTilesTasker: MergeTilesTasker
  ) {}

  public async createLayer(data: IngestionParams): Promise<void> {
    const convertedData: Record<string, unknown> = data.metadata as unknown as Record<string, unknown>;
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const productType = data.metadata.productType as ProductType;
    const layerRelativePath = `${data.metadata.productId as string}/${data.metadata.productType as string}`;
    const jobType = await this.getJobType(data);

    if (convertedData.id !== undefined) {
      throw new BadRequestError(`received invalid field id`);
    }
    await this.validateFiles(data);
    await this.validateNotRunning(resourceId, productType);

    if (jobType === JobType.NEW) {
      const layerZoomRanges = this.zoomLevelCalculator.createLayerZoomRanges(data.metadata.maxResolutionDeg as number);

      await this.validateNotExistsInMapServer(resourceId, productType);
      await this.validateNotExistsInCatalog(resourceId, version, productType);

      this.logger.log('info', `creating "New" job and "Split-Tiles" tasks for layer ${data.metadata.productId as string} type: ${productType}`);
      await this.splitTilesTasker.createSplitTilesTasks(data, layerRelativePath, layerZoomRanges, jobType);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (jobType === JobType.UPDATE) {
      const files = data.fileNames;
      this.validateSupportedFiles(files);

      this.logger.log('info', `creating "Update" job and "Merge" tasks for layer ${data.metadata.productId as string} type: ${productType}`);
      await this.mergeTilesTasker.createMergeTasks(data, layerRelativePath);
    }
  }

  private async getJobType(data: IngestionParams): Promise<JobType> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const productType = data.metadata.productType as ProductType;

    const existsLayerVersions = await this.catalog.getLayerVersions(resourceId, productType);

    if (existsLayerVersions) {
      const highestExistsLayerVersion = Math.max(...existsLayerVersions);
      const requestedLayerVersion = parseFloat(version);
      if (!existsLayerVersions.length) {
        return JobType.NEW;
      }
      if (requestedLayerVersion > highestExistsLayerVersion) {
        return JobType.UPDATE;
      } else {
        throw new BadRequestError(
          `layer id: ${resourceId} version: ${version} product type: ${productType} has already the same or higher version (${highestExistsLayerVersion}) in catalog`
        );
      }
    }
    return JobType.NEW;
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

  private async validateNotRunning(resourceId: string, productType: ProductType): Promise<void> {
    const jobs = await this.db.findJobs(resourceId, productType);
    jobs.forEach((job) => {
      if (job.status == OperationStatus.IN_PROGRESS || job.status == OperationStatus.PENDING) {
        throw new ConflictError(`layer id: ${resourceId} product type: ${productType}, generation is already running`);
      }
    });
  }

  private async validateNotExistsInCatalog(resourceId: string, version?: string, productType?: string): Promise<void> {
    const existsInCatalog = await this.catalog.exists(resourceId, version, productType);
    if (existsInCatalog) {
      throw new ConflictError(`layer id: ${resourceId} version: ${version as string}, already exists in catalog`);
    }
  }

  private validateSupportedFiles(files: string[]): void {
    const validSupportedFiles = this.fileValidator.validateGpkgFiles(files);
    if (!validSupportedFiles) {
      throw new BadRequestError('Invalid files list, UPDATE operation supports: "gpkg" files only.');
    }
  }
}
