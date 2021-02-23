import { LayerMetadata } from '@map-colonies/mc-model-types';
import { inject, injectable } from 'tsyringe';
import { Services } from '../../common/constants';
import { BadRequestError } from '../../common/exceptions/http/badRequestError';
import { ConflictError } from '../../common/exceptions/http/conflictError';
import { IConfig, ILogger } from '../../common/interfaces';
import { CatalogClient } from '../../serviceClients/catalogClient';
import { MapPublisherClient } from '../../serviceClients/mapPublisherClient';
import { StorageClient, TaskState } from '../../serviceClients/storageClient';
import { TillerClient } from '../../serviceClients/tillerClient';
import { ITaskId, ITaskZoomRange } from '../../tasks/interfaces';
import { FileValidator } from './fileValidator';

@injectable()
export class LayersManager {
  private readonly zoomRanges: ITaskZoomRange[];
  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly tiller: TillerClient,
    private readonly db: StorageClient,
    private readonly catalog: CatalogClient,
    private readonly mapPublisher: MapPublisherClient,
    private readonly fileValidator: FileValidator
  ) {
    this.zoomRanges = this.getZoomRanges(config);
  }

  public async createLayer(metadata: LayerMetadata): Promise<void> {
    await this.validateRunConditions(metadata);
    this.logger.log('info', `saving metadata for layer ${metadata.source as string}`);
    const tillerRequests = await this.db.createLayerTasks(metadata, this.zoomRanges);
    //add tiling tasks to queue
    const tillerTasks: Promise<void>[] = [];
    tillerRequests.forEach((req) => {
      //TODO: handle case of kafka errors after metadata save
      tillerTasks.push(this.tiller.addTilingRequest(req));
      this.logger.log('info', `queuing zoom levels: ${req.min_zoom_level}-${req.max_zoom_level} for layer ${req.discrete_id}-${req.version}`);
    });
    await Promise.all(tillerTasks);
  }

  private getZoomRanges(config: IConfig): ITaskZoomRange[] {
    const batches = config.get<string>('tiling.zoomGroups');
    const zoomBatches = batches.split(',');
    const zoomRanges = zoomBatches.map((batch) => {
      const limits = batch.split('-').map((value) => Number.parseInt(value));
      const zoomRange: ITaskZoomRange = {
        minZoom: Math.min(...limits),
        maxZoom: Math.max(...limits),
      };
      return zoomRange;
    });
    return zoomRanges;
  }

  private async validateRunConditions(metadata: LayerMetadata): Promise<void> {
    const id: ITaskId = {
      id: metadata.source as string,
      version: metadata.version as string,
    };
    await this.validateNotRunning(id);
    await this.validateNotExistsInCatalog(id);
    await this.validateNotExistsInMapServer(id);
    await this.validateFiles(metadata);
  }

  private async validateFiles(metadata: LayerMetadata): Promise<void> {
    const filesExists = await this.fileValidator.validateExists(metadata.fileUris as string[]);
    if (!filesExists) {
      throw new BadRequestError('invalid files list');
    }
  }

  private async validateNotExistsInMapServer(id: ITaskId): Promise<void> {
    const existsInMapServer = await this.mapPublisher.exists(`${id.id}-${id.version}`);
    if (existsInMapServer) {
      throw new ConflictError('layer already exists');
    }
  }

  private async validateNotRunning(id: ITaskId): Promise<void> {
    const status = await this.db.getLayerStatus(id);
    if (status != undefined && (status == TaskState.IN_PROGRESS || status == TaskState.PENDING)) {
      throw new ConflictError('layer generation is already running');
    }
  }

  private async validateNotExistsInCatalog(id: ITaskId): Promise<void> {
    const existsInCatalog = await this.catalog.exists(id);
    if (existsInCatalog) {
      throw new ConflictError('layer already exists in catalog');
    }
  }
}
