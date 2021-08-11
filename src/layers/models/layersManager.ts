import { IngestionParams } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { OperationStatus } from '../../common/enums';
import { BadRequestError } from '../../common/exceptions/http/badRequestError';
import { ConflictError } from '../../common/exceptions/http/conflictError';
import { ILogger } from '../../common/interfaces';
import { CatalogClient } from '../../serviceClients/catalogClient';
import { MapPublisherClient } from '../../serviceClients/mapPublisherClient';
import { StorageClient } from '../../serviceClients/storageClient';
import { ZoomLevelCalculateor } from '../../utils/zoomToResulation';
import { FileValidator } from './fileValidator';

@injectable()
export class LayersManager {
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    private readonly zoomLevelCalculateor: ZoomLevelCalculateor,
    private readonly db: StorageClient,
    private readonly catalog: CatalogClient,
    private readonly mapPublisher: MapPublisherClient,
    private readonly fileValidator: FileValidator
  ) {}

  public async createLayer(data: IngestionParams): Promise<void> {
    await this.validateRunConditions(data);
    this.logger.log('info', `creating job and tasks for layer ${data.metadata.productId as string}`);
    const layerZoomRanges = this.zoomLevelCalculateor.createLayerZoomRanges(data.metadata.resolution as number);
    await this.db.createLayerTasks(data, layerZoomRanges);
  }

  private async validateRunConditions(data: IngestionParams): Promise<void> {
    const resourceId = data.metadata.productId as string;
    const version = data.metadata.productVersion as string;
    await this.validateNotRunning(resourceId, version);

    await this.validateNotExistsInCatalog(resourceId, version);
    await this.validateNotExistsInMapServer(resourceId, version);
    await this.validateFiles(data);
  }

  private async validateFiles(data: IngestionParams): Promise<void> {
    const filesExists = await this.fileValidator.validateExists(data.originDirectory, data.fileNames);
    if (!filesExists) {
      throw new BadRequestError('invalid files list, some files are missing');
    }
  }

  private async validateNotExistsInMapServer(resourceId: string, version: string): Promise<void> {
    const existsInMapServer = await this.mapPublisher.exists(`${resourceId}-${version}`);
    if (existsInMapServer) {
      throw new ConflictError(`layer ${resourceId}-${version} already exists on mapProxy`);
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

  private async validateNotExistsInCatalog(resourceId: string, version: string): Promise<void> {
    const existsInCatalog = await this.catalog.exists(resourceId, version);
    if (existsInCatalog) {
      throw new ConflictError(`layer id: ${resourceId} version: ${version}, already exists in catalog`);
    }
  }
}
