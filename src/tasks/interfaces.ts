import { LayerMetadata } from '@map-colonies/mc-model-types';

export interface ICompletedTasks {
  completed: boolean;
  successful: boolean;
  metadata: LayerMetadata;
}

export interface ITaskZoomRange {
  minZoom: number;
  maxZoom: number;
}
