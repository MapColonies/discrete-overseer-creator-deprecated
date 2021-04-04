import { LayerMetadata } from '@map-colonies/mc-model-types';

export interface ICompletedTasks {
  completed: boolean;
  successful: boolean;
  metaData: LayerMetadata;
}

export interface ITillerRequest {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  job_id: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  task_id: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  discrete_id: string;
  version: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  min_zoom_level: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  max_zoom_level: number;
}

export interface ITaskZoomRange {
  minZoom: number;
  maxZoom: number;
}
