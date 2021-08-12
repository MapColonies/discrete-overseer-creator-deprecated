import { inject, singleton } from 'tsyringe';
import { BadRequestError } from '../common/exceptions/http/badRequestError';
import { ITaskZoomRange } from '../tasks/interfaces';
import { Services } from '../common/constants';
import { IConfig, ILogger } from '../common/interfaces';

// eslint-disable-next-line import/exports-last
export const zoomToResolutionArray: number[] = [
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.703125, // 0
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.3515625, // 1
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.17578125, // 2
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.087890625, // 3
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.0439453125, // 4
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.02197265625, // 5
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.010986328125, // 6
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.0054931640625, // 7
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.00274658203125, // 8
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.001373291015625, // 9
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.0006866455078125, // 10
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.00034332275390625, // 11
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  0.000171661376953125, // 12
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  8.58306884765625e-5, // 13
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  4.29153442382812e-5, // 14
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  2.14576721191406e-5, // 15
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  1.07288360595703e-5, // 16
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  5.36441802978516e-6, // 17
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  2.68220901489258e-6, // 18
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  1.34110450744629e-6, // 19
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  6.70552253723145e-7, // 20
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  3.35276126861572e-7, // 21
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  1.67638063430786e-7, // 22
].reverse();

@singleton()
export class ZoomLevelCalculateor {
  private readonly zoomRanges: ITaskZoomRange[];

  public constructor(@inject(Services.LOGGER) private readonly logger: ILogger, @inject(Services.CONFIG) private readonly config: IConfig) {
    const batches = config.get<string>('tiling.zoomGroups');
    this.zoomRanges = this.getZoomRanges(batches);
  }

  public createLayerZoomRanges(resolution: number): ITaskZoomRange[] {
    const maxZoom = this.getZoomByResolution(resolution);
    const layerZoomRanges = this.zoomRanges
      .filter((range) => {
        return range.minZoom <= maxZoom;
      })
      .map((range) => {
        const taskRange: ITaskZoomRange = { minZoom: range.minZoom, maxZoom: range.maxZoom <= maxZoom ? range.maxZoom : maxZoom };
        return taskRange;
      });
    return layerZoomRanges;
  }

  public getZoomByResolution(resolution: number): number {
    if (resolution <= 0) {
      throw new BadRequestError(`invalid resolution: ${resolution}`);
    }

    if (resolution <= zoomToResolutionArray[0]) {
      return zoomToResolutionArray.length;
    }
    if (resolution >= zoomToResolutionArray[zoomToResolutionArray.length - 1]) {
      return 0;
    }

    const result = this.lowerInsertionPoint(zoomToResolutionArray, resolution);
    return zoomToResolutionArray.length - result;
  }

  private getZoomRanges(batches: string): ITaskZoomRange[] {
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

  private lowerInsertionPoint(arr: number[], resolution: number): number {
    if (resolution < arr[0]) {
      return 0;
    } else if (resolution > arr[arr.length - 1]) {
      return arr.length - 1;
    }

    let lowerPnt = 0;
    let i = 1;

    while (i < arr.length && arr[i] < resolution) {
      lowerPnt = i;
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      i = i * 2;
    }

    // Final check for the remaining elements which are < resolution
    while (lowerPnt < arr.length && arr[lowerPnt] <= resolution) {
      lowerPnt++;
    }

    return lowerPnt;
  }
}
