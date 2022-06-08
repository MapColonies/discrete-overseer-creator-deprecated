import { IRasterCatalogUpsertRequestBody } from '@map-colonies/mc-model-types';
import { ITileRange } from '@map-colonies/mc-utils';
import { GeoJSON } from 'geojson';

export interface ILogger {
  log: (level: string, message: string) => void;
}

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface OpenApiConfig {
  filePath: string;
  basePath: string;
  jsonPath: string;
  uiPath: string;
}

export interface IFindResponseRecord extends IRasterCatalogUpsertRequestBody {
  id: string;
}

export type FindRecordResponse = IFindResponseRecord[];

export interface ILayerMergeData {
  id: string;
  tilesPath: string;
  footprint?: GeoJSON;
}

export interface IMergeParameters {
  layers: ILayerMergeData[];
  destPath: string;
  maxZoom: number;
}

export interface IMergeOverlaps {
  layers: ILayerMergeData[];
  intersection: GeoJSON;
}

export interface IMergeSources {
  type: string;
  path: string;
}

export interface IMergeTaskParams {
  sources: IMergeSources[];
  batches: ITileRange[];
}
