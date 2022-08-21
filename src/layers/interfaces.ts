import { BBox } from '@turf/helpers';
import { IngestionParams } from '@map-colonies/mc-model-types';

export interface IPublishMapLayerRequest {
  name: string;
  tilesPath: string;
  cacheType: PublishedMapLayerCacheType;
}

export enum PublishedMapLayerCacheType {
  FS = 'file',
  S3 = 's3',
  GPKG = 'geopackage',
}

export interface LayerIngestionParams extends IngestionParams {
  origin?: Origin;
  grid?: Grid;
}

export interface ITaskParameters {
  discreteId: string;
  version: string;
  originDirectory: string;
  minZoom: number;
  maxZoom: number;
  layerRelativePath: string;
  bbox: BBox;
}

export interface IBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export enum Grid {
  TWO_ON_ONE = '2X1',
  ONE_ON_ONE = '1X1',
}

export enum Origin {
  UPPER_LEFT = 'UL',
  LOWER_LEFT = 'LL',
}
