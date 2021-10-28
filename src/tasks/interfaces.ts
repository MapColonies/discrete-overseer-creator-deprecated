import { LayerMetadata } from '@map-colonies/mc-model-types';

export interface ICompletedTasks {
  completed: boolean;
  successful: boolean;
  metadata: LayerMetadata;
  relativePath: string;
}

export interface ITaskZoomRange {
  minZoom: number;
  maxZoom: number;
}
