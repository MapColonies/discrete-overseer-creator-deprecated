export interface IPublishMapLayerRequest {
  name: string;
  tilesPath: string;
  maxZoomLevel: number;
  cacheType: PublishedMapLayerCacheType;
}

export enum PublishedMapLayerCacheType {
  FS = 'file',
  S3 = 's3',
  GPKG = 'geopackage',
}
