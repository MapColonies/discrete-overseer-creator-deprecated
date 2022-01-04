import { singleton, inject } from 'tsyringe';
import { TileRanger, tileToBbox } from '@map-colonies/mc-utils';
import { IngestionParams } from '@map-colonies/mc-model-types';
import { Polygon } from '@turf/helpers';
import { ITaskParameters } from '../interfaces';
import { ITaskZoomRange } from '../../tasks/interfaces';
import { Services } from '../../common/constants';
import { IConfig } from '../../common/interfaces';

@singleton()
export class Tasker {
  private readonly bboxSizeTiles: number;
  public constructor(@inject(Services.CONFIG) private readonly config: IConfig) {
    this.bboxSizeTiles = config.get<number>('bboxSizeTiles');
  }

  public generateTasksParameters(data: IngestionParams, zoomRanges: ITaskZoomRange[]): ITaskParameters[] {
    const layerRelativePath = `${data.metadata.productId as string}/${data.metadata.productVersion as string}/${data.metadata.productType as string}`;
    const ranger = new TileRanger();
    const taskParams: ITaskParameters[] = [];
    for (const zoomRange of zoomRanges) {
      const zoom = this.getZoom(zoomRange.maxZoom);
      console.log(zoom);
      const tileGen = ranger.generateTiles(data.metadata.footprint as Polygon, zoom);
      for (const tile of tileGen) {
        console.log(tile);
        taskParams.push({
          discreteId: data.metadata.productId as string,
          version: data.metadata.productVersion as string,
          fileNames: data.fileNames,
          originDirectory: data.originDirectory,
          minZoom: zoomRange.minZoom,
          maxZoom: zoomRange.maxZoom,
          layerRelativePath: layerRelativePath,
          bbox: tileToBbox(tile),
        });
      }
    }
    return taskParams;
  }

  private getZoom(maxRequestedZoom: number): number {
    /* eslint-disable @typescript-eslint/no-magic-numbers */
    const diff = Math.max(0, Math.floor(Math.log2(this.bboxSizeTiles >> 1) >> 1));
    return Math.max(0, maxRequestedZoom - diff);
    /* eslint-enable @typescript-eslint/no-magic-numbers */
  }
}