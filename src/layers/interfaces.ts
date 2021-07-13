export interface IPublishMapLayerRequest {
  name: string;
  tilesPath: string;
  maxZoomLevel: number;
  description: string;
  cacheType: PublishedMapLayerCacheType;
}

export enum PublishedMapLayerCacheType {
  FS = 'file',
  S3 = 's3',
  GPKG = 'geopackage',
}
