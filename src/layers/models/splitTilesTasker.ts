import { GeoJSON } from 'geojson';
import { singleton, inject } from 'tsyringe';
import { TileRanger, tileToBbox } from '@map-colonies/mc-utils';
import { IngestionParams } from '@map-colonies/mc-model-types';
import { Polygon } from '@turf/helpers';
import { ITaskParameters } from '../interfaces';
import { ITaskZoomRange } from '../../tasks/interfaces';
import { Services } from '../../common/constants';
import { IConfig } from '../../common/interfaces';
import { OperationStatus } from '../../common/enums';
import { JobManagerClient } from '../../serviceClients/jobManagerClient';
import { createBBoxString } from '../../utils/bbox';
import { layerMetadataToPolygonParts } from '../../common/utills/polygonPartsBuilder';

@singleton()
export class SplitTilesTasker {
  private readonly bboxSizeTiles: number;
  private readonly tasksBatchSize: number;

  public constructor(@inject(Services.CONFIG) private readonly config: IConfig, private readonly db: JobManagerClient) {
    this.bboxSizeTiles = config.get<number>('ingestionTilesSplittingTiles.bboxSizeTiles');
    this.tasksBatchSize = config.get<number>('ingestionTilesSplittingTiles.tasksBatchSize');
  }

  public async createSplitTilesTasks(
    data: IngestionParams,
    layerRelativePath: string,
    layerZoomRanges: ITaskZoomRange[],
    jobType: string,
    taskType: string
  ): Promise<void> {
    this.setDefaultValues(data);
    const taskParams = this.generateTasksParameters(data, layerRelativePath, layerZoomRanges);
    let taskBatch: ITaskParameters[] = [];
    let jobId: string | undefined = undefined;
    for (const task of taskParams) {
      taskBatch.push(task);
      if (taskBatch.length === this.tasksBatchSize) {
        if (jobId === undefined) {
          jobId = await this.db.createLayerJob(data, layerRelativePath, jobType, taskType, taskBatch);
        } else {
          // eslint-disable-next-line no-useless-catch
          try {
            await this.db.createTasks(jobId, taskBatch, taskType);
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
        jobId = await this.db.createLayerJob(data, layerRelativePath, jobType, taskType, taskBatch);
      } else {
        // eslint-disable-next-line no-useless-catch
        try {
          await this.db.createTasks(jobId, taskBatch, taskType);
        } catch (err) {
          //TODO: properly handle errors
          await this.db.updateJobStatus(jobId, OperationStatus.FAILED);
          throw err;
        }
      }
    }
  }
  public *generateTasksParameters(data: IngestionParams, layerRelativePath: string, zoomRanges: ITaskZoomRange[]): Generator<ITaskParameters> {
    const ranger = new TileRanger();
    for (const zoomRange of zoomRanges) {
      const zoom = this.getZoom(zoomRange.maxZoom);
      const tileGen = ranger.generateTiles(data.metadata.footprint as Polygon, zoom);
      for (const tile of tileGen) {
        yield {
          discreteId: data.metadata.productId as string,
          version: data.metadata.productVersion as string,
          originDirectory: data.originDirectory,
          minZoom: zoomRange.minZoom,
          maxZoom: zoomRange.maxZoom,
          layerRelativePath: layerRelativePath,
          bbox: tileToBbox(tile),
        };
      }
    }
  }

  /**
   * this function calculate the zoom level where tile contains the maximum amount of tiles
   * in "maxRequestedZoom" that is smaller or equels to the configured value "bboxSizeTiles"
   * @param maxRequestedZoom task maximum tile`s zoom
   * @returns optimized zoom level for bbox equivalent tile
   */
  private getZoom(maxRequestedZoom: number): number {
    /* eslint-disable @typescript-eslint/no-magic-numbers */
    const diff = Math.max(0, Math.floor(Math.log2(this.bboxSizeTiles >> 1) >> 1));
    return Math.max(0, maxRequestedZoom - diff);
    /* eslint-enable @typescript-eslint/no-magic-numbers */
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
