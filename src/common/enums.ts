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
  DISCRETE_TILING = 'Discrete-Tiling',
  UPDATE = 'Update'
}

export enum TaskType {
  DISCRETE_TILING = 'Discrete-Tiling',
  MERGE = 'Merge'
}

export enum SourceType {
  S3 = 'S3',
  FS = 'FS',
  GPKG = 'GPKG'
}
