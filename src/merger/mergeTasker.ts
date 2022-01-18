import { subGroupsGen, multiIntersect, Footprint, tileBatchGenerator, TileRanger, snapBBoxToTileGrid } from '@map-colonies/mc-utils';
import { difference, union, bbox as toBbox, bboxPolygon, Feature, Polygon } from '@turf/turf';
import { inject, singleton } from 'tsyringe';
import { Services } from '../common/constants';
import { ILayerMergeData, IMergeParameters, IMergeOverlaps, IConfig, IMergeTaskParams, ILogger } from '../common/interfaces';

@singleton()
export class MergeTasker {
  private readonly tileRanger: TileRanger;
  private readonly batchSize: number;

  public constructor(@inject(Services.CONFIG) config: IConfig, @inject(Services.LOGGER) private readonly logger: ILogger) {
    this.batchSize = config.get('mergeBatchSize');
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
            batch,
            destPath: params.destPath,
            sourcePaths: overlap.layers.map((layer) => layer.tilesPath),
          };
        }
      }
    }
  }
}
