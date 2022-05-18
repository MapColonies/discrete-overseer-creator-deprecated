//TODO: replace with model
export enum OperationStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In-Progress',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  EXPIRED = 'Expired',
  ABORTED = 'Aborted',
}

export enum MapServerCacheType {
  FS = 'FS',
  S3 = 'S3',
}

export enum JobType {
  NEW = 'New',
  UPDATE = 'Update',
}

export enum TaskType {
  SPLIT_TILES = 'Split-Tiles',
  MERGE_TILES = 'Merge-Tiles',
}

export enum SourceType {
  S3 = 'S3',
  FS = 'FS',
  GPKG = 'GPKG',
}
