import { LayerMetadata } from '@map-colonies/mc-model-types';
import { StorageClient } from '../../../src/serviceClients/storageClient';
import { ITaskZoomRange } from '../../../src/tasks/interfaces';

const createLayerTasksMock = jest.fn();
const getCompletedZoomLevelsMock = jest.fn();
const updateJobStatusMock = jest.fn();
const findJobsMock = jest.fn();

const dbClientMock = ({
  createLayerTasks: createLayerTasksMock,
  getCompletedZoomLevels: getCompletedZoomLevelsMock,
  updateJobStatus: updateJobStatusMock,
  findJobs: findJobsMock,
} as unknown) as StorageClient;

function mockCreateLayerTasks(): void {
  const idBuilder = {
    counter: 0,
  };
  createLayerTasksMock.mockImplementation((metadata: LayerMetadata, ranges: ITaskZoomRange[]) => {
    return ranges.map((range) => {
      const req = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        discrete_id: metadata.productId,
        version: metadata.productVersion,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        task_id: idBuilder.counter,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        min_zoom_level: range.minZoom,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        max_zoom_level: range.maxZoom,
      };
      idBuilder.counter++;
      return req;
    });
  });
}

export { updateJobStatusMock, getCompletedZoomLevelsMock, createLayerTasksMock, findJobsMock, dbClientMock, mockCreateLayerTasks };
