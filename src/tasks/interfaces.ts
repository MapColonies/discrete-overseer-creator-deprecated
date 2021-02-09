export interface ITaskId {
  id: string;
  version: string;
}

export interface ICompletedTasks {
  allCompleted: boolean;
}

export interface ITillerRequest {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  discrete_id: string;
  version: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  task_id: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  min_zoom_level: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  max_zoom_level: number;
}
