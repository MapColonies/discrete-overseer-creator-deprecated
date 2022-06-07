import { join } from 'path';
import { IngestionParams } from '@map-colonies/mc-model-types';
import {
  subGroupsGen,
  multiIntersect,
  Footprint,
  tileBatchGenerator,
  TileRanger,
  snapBBoxToTileGrid,
  degreesPerPixelToZoomLevel,
} from '@map-colonies/mc-utils';
import { difference, union, bbox as toBbox, bboxPolygon, Feature, Polygon } from '@turf/turf';
import { inject, singleton } from 'tsyringe';
import { Services } from '../common/constants';
import { OperationStatus } from '../common/enums';
import { ILayerMergeData, IMergeParameters, IMergeOverlaps, IConfig, IMergeTaskParams, ILogger, IMergeSources } from '../common/interfaces';
import { JobManagerClient } from '../serviceClients/jobManagerClient';

@singleton()
export class MergeTilesTasker {
  private readonly tileRanger: TileRanger;
  private readonly batchSize: number;
  private readonly mergeTaskBatchSize: number;
  private readonly sourceDir: string;
  private readonly jobType: string;

  public constructor(
    @inject(Services.CONFIG) private readonly config: IConfig,
    @inject(Services.LOGGER) private readonly logger: ILogger,
    private readonly db: JobManagerClient
  ) {
    this.batchSize = config.get('ingestionMergeTiles.mergeBatchSize');
    this.mergeTaskBatchSize = config.get<number>('ingestionMergeTiles.mergeBatchSize');
    this.sourceDir = this.config.get<string>('layerSourceDir');
    this.jobType = this.config.get<string>('ingestionUpdateJobType');
    this.tileRanger = new TileRanger();
  }

  public *createLayerOverlaps(layers: ILayerMergeData[]): Generator<IMergeOverlaps> {
    let totalIntersection = undefined;
    const subGroups = subGroupsGen(layers, layers.length);
    for (const subGroup of subGroups) {
      const subGroupFootprints = subGroup.map((layer) => layer.footprint as Footprint);
      try {
        let intersection = multiIntersect(subGroupFootprints);
        if (intersection === null) {
          continue;
        }
        if (totalIntersection === undefined) {
          totalIntersection = intersection;
        } else {
          intersection = difference(intersection, totalIntersection as Footprint);
          if (intersection === null) {
            continue;
          }
          totalIntersection = union(totalIntersection as Footprint, intersection);
        }
        const task: IMergeOverlaps = {
          intersection,
          layers: subGroup,
        };
        yield task;
      } catch (err) {
        const error = err as Error;
        this.logger.log('error', `failed to calculate overlaps: ${error.message}`);
        this.logger.log('debug', `failing footprints: ${JSON.stringify(subGroupFootprints)}`);
        throw err;
      }
    }
  }

  public *createBatchedTasks(params: IMergeParameters): Generator<IMergeTaskParams> {
    const sourceType = this.config.get<string>('mapServerCacheType');
    const bboxedLayers = params.layers.map((layer) => {
      const bbox = toBbox(layer.footprint) as [number, number, number, number];
      return {
        id: layer.id,
        tilesPath: layer.tilesPath,
        footprint: bbox,
      };
    });
    for (let zoom = params.maxZoom; zoom >= 0; zoom--) {
      const snappedLayers = bboxedLayers.map((layer) => {
        const poly = bboxPolygon(snapBBoxToTileGrid(layer.footprint, zoom));
        return { ...layer, footprint: poly };
      });
      const overlaps = this.createLayerOverlaps(snappedLayers);
      for (const overlap of overlaps) {
        const rangeGen = this.tileRanger.encodeFootprint(overlap.intersection as Feature<Polygon>, zoom);
        const batches = tileBatchGenerator(this.batchSize, rangeGen);
        for (const batch of batches) {
          yield {
            batches: batch,
            sources: [
              {
                type: sourceType,
                path: params.destPath,
              },
            ].concat(
              overlap.layers.map<IMergeSources>((layer) => {
                return {
                  type: sourceType,
                  path: layer.tilesPath,
                };
              })
            ),
          };
        }
      }
    }
  }

  public async createMergeTilesTasks(data: IngestionParams, layerRelativePath: string, taskType: string): Promise<void> {
    const layers = data.fileNames.map<ILayerMergeData>((fileName) => {
      const fileFullPath = join(this.sourceDir, fileName);
      const footprint = data.metadata.footprint;
      return {
        id: fileName,
        tilesPath: fileFullPath,
        footprint: footprint,
      };
    });
    const maxZoom = degreesPerPixelToZoomLevel(data.metadata.maxResolutionDeg as number);
    const params: IMergeParameters = {
      layers: layers,
      destPath: layerRelativePath,
      maxZoom: maxZoom,
    };
    const mergeTasksParams = this.createBatchedTasks(params);
    let mergeTaskBatch: IMergeTaskParams[] = [];
    let jobId: string | undefined = undefined;
    for (const mergeTask of mergeTasksParams) {
      mergeTaskBatch.push(mergeTask);
      if (mergeTaskBatch.length === this.mergeTaskBatchSize) {
        if (jobId === undefined) {
          jobId = await this.db.createLayerJob(data, layerRelativePath, this.jobType, taskType, mergeTaskBatch);
        } else {
          try {
            await this.db.createTasks(jobId, mergeTaskBatch, taskType);
          } catch (err) {
            await this.db.updateJobStatus(jobId, OperationStatus.FAILED);
            throw err;
          }
        }
        mergeTaskBatch = [];
      }
    }
    if (mergeTaskBatch.length !== 0) {
      if (jobId === undefined) {
        await this.db.createLayerJob(data, layerRelativePath, this.jobType, taskType, mergeTaskBatch);
      } else {
        // eslint-disable-next-line no-useless-catch
        try {
          await this.db.createTasks(jobId, mergeTaskBatch, taskType);
        } catch (err) {
          //TODO: properly handle errors
          await this.db.updateJobStatus(jobId, OperationStatus.FAILED);
          throw err;
        }
      }
    }
  }
}
