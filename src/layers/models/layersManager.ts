import { IngestionParams, ProductType } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import bbox from '@turf/bbox';
import { GeoJSON } from 'geojson';
import { Services } from '../../common/constants';
import { OperationStatus } from '../../common/enums';
import { BadRequestError } from '../../common/exceptions/http/badRequestError';
import { ConflictError } from '../../common/exceptions/http/conflictError';
import { ILogger } from '../../common/interfaces';
import { CatalogClient } from '../../serviceClients/catalogClient';
import { MapPublisherClient } from '../../serviceClients/mapPublisherClient';
import { StorageClient } from '../../serviceClients/storageClient';
import { ZoomLevelCalculator } from '../../utils/zoomToResolution';
import { getMapServingLayerName } from '../../utils/layerNameGenerator';
import { FileValidator } from './fileValidator';

@injectable()
export class LayersManager {
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    private readonly zoomLevelCalculator: ZoomLevelCalculator,
    private readonly db: StorageClient,
    private readonly catalog: CatalogClient,
    private readonly mapPublisher: MapPublisherClient,
    private readonly fileValidator: FileValidator
  ) {}

  public async createLayer(data: IngestionParams): Promise<void> {
    const convertedData: Record<string, unknown> = data.metadata as unknown as Record<string, unknown>;
    if (convertedData.id !== undefined) {
      throw new BadRequestError(`received invalid field id`);
    }

    if (data.metadata.productType === ProductType.ORTHOPHOTO) {
      data.metadata.productType = ProductType.ORTHOPHOTO_HISTORY;
    }
    await this.validateRunConditions(data);
    data.metadata.srsId = data.metadata.srsId === undefined ? '4326' : data.metadata.srsId;
    data.metadata.srsName = data.metadata.srsName === undefined ? 'WGS84GEO' : data.metadata.srsName;
    data.metadata.productBoundingBox = this.createBBox(data.metadata.footprint as GeoJSON);
    this.logger.log('info', `creating job and tasks for layer ${data.metadata.productId as string}`);
    const layerZoomRanges = this.zoomLevelCalculator.createLayerZoomRanges(data.metadata.resolution as number);
    await this.db.createLayerTasks(data, layerZoomRanges);
  }

  private async validateRunConditions(data: IngestionParams): Promise<void> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    const productType = data.metadata.productType as ProductType;
    await this.validateNotRunning(resourceId, version);

    // todo: version 1.0 condition defines only one material with the same ID, no history parts are allowed
    if (data.metadata.productType === ProductType.ORTHOPHOTO_HISTORY) {
      await this.validateNotExistsInCatalog(resourceId);
    } else {
      await this.validateNotExistsInCatalog(resourceId, version);
    }
    await this.validateNotExistsInMapServer(resourceId, version, productType);
    await this.validateFiles(data);
  }

  private async validateFiles(data: IngestionParams): Promise<void> {
    const filesExists = await this.fileValidator.validateExists(data.originDirectory, data.fileNames);
    if (!filesExists) {
      throw new BadRequestError('invalid files list, some files are missing');
    }
  }

  private async validateNotExistsInMapServer(productId: string, productVersion: string, productType: ProductType): Promise<void> {
    const layerName = getMapServingLayerName(productId, productVersion, productType);
    const existsInMapServer = await this.mapPublisher.exists(layerName);
    if (existsInMapServer) {
      throw new ConflictError(`layer ${layerName}, already exists on mapProxy`);
    }
  }

  private async validateNotRunning(resourceId: string, version: string): Promise<void> {
    const jobs = await this.db.findJobs(resourceId, version);
    jobs.forEach((job) => {
      if (job.status == OperationStatus.IN_PROGRESS || job.status == OperationStatus.PENDING) {
        throw new ConflictError(`layer id: ${resourceId} version: ${version}, generation is already running`);
      }
    });
  }

  private async validateNotExistsInCatalog(resourceId: string, version?: string): Promise<void> {
    const existsInCatalog = await this.catalog.exists(resourceId, version);
    if (existsInCatalog) {
      throw new ConflictError(`layer id: ${resourceId} version: ${version as string}, already exists in catalog`);
    }
  }

  private createBBox(footprint: GeoJSON): string {
    const bboxCords = bbox(footprint);
    //format: "minX,minY : maxX,maxY"
    return `${bboxCords[0]},${bboxCords[1]},${bboxCords[2]},${bboxCords[3]}`;
  }
}
