// import { LayerMetadata } from '@map-colonies/mc-model-types';
// import { ITaskParameters } from '../../../src/layers/interfaces';
import { JobManagerClient } from '../../../src/serviceClients/jobManagerClient';

const createLayerJobMock = jest.fn();
const createTasksMock = jest.fn();
const getCompletedZoomLevelsMock = jest.fn();
const updateJobStatusMock = jest.fn();
const findJobsMock = jest.fn();

const jobManagerClientMock = {
  createLayerJob: createLayerJobMock,
  createTasks: createTasksMock,
  getCompletedZoomLevels: getCompletedZoomLevelsMock,
  updateJobStatus: updateJobStatusMock,
  findJobs: findJobsMock,
} as unknown as JobManagerClient;

// function mockCreateLayerTasks(): void {
//   const idBuilder = {
//     counter: 0,
//   };
//   createLayerTasksMock.mockImplementation((metadata: LayerMetadata, layerRelativePath: string, params: ITaskParameters[]) => {
//     return params.map((range) => {
//       const req = {
//         // eslint-disable-next-line @typescript-eslint/naming-convention
//         discrete_id: metadata.productId,
//         version: metadata.productVersion,
//         // eslint-disable-next-line @typescript-eslint/naming-convention
//         task_id: idBuilder.counter,
//         // eslint-disable-next-line @typescript-eslint/naming-convention
//         min_zoom_level: range.minZoom,
//         // eslint-disable-next-line @typescript-eslint/naming-convention
//         max_zoom_level: range.maxZoom,
//         bbox: range.bbox,
//       };
//       idBuilder.counter++;
//       return req;
//     });
//   });
// }

export { createLayerJobMock, createTasksMock, updateJobStatusMock, getCompletedZoomLevelsMock, findJobsMock, jobManagerClientMock };
