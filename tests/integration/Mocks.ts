import { LayerMetadata } from '@map-colonies/mc-model-types';
import { ILogger } from '../../src/common/interfaces';
import { MapPublisherClient } from '../../src/serviceClients/publisherClient';
import { StorageClient } from '../../src/serviceClients/storageClient';
import { TillerClient } from '../../src/serviceClients/tillerClient';
import { ITaskZoomRange } from '../../src/tasks/interfaces';

//storage client mock
const getCompletedZoomLevelsMock = jest.fn();
const updateTaskStatusMock = jest.fn();
const createLayerTasksMock = jest.fn();
const dbMock = ({
  getCompletedZoomLevels: getCompletedZoomLevelsMock,
  updateTaskStatus: updateTaskStatusMock,
  createLayerTasks: createLayerTasksMock,
} as unknown) as StorageClient;

const storage = {
  updateTaskStatusMock: updateTaskStatusMock,
  getCompletedZoomLevelsMock: getCompletedZoomLevelsMock,
  createLayerTasksMock: createLayerTasksMock,
  clientMock: dbMock,
};

//tiller client mock
const addTilingRequestMock = jest.fn();
const tillerMock = ({
  addTilingRequest: addTilingRequestMock,
} as unknown) as TillerClient;
const tiller = {
  addTilingRequestMock: addTilingRequestMock,
  clientMock: tillerMock,
};

//publisher client mock
const publishLayerMock = jest.fn();
const mapPublisherMock = ({
  publishLayer: publishLayerMock,
} as unknown) as MapPublisherClient;
const mapPublisher = {
  publishLayerMock: publishLayerMock,
  clientMock: mapPublisherMock,
};

//logger mock
const logMock = jest.fn();
const loggerMocker = {
  log: logMock,
} as ILogger;
const logger = {
  logMock: logMock,
  logger: loggerMocker,
};

const resetMocks = (): void => {
  updateTaskStatusMock.mockReset();
  getCompletedZoomLevelsMock.mockReset();
  createLayerTasksMock.mockReset();
  addTilingRequestMock.mockReset();
  publishLayerMock.mockReset();
  logMock.mockReset();
  mockCreateLayerTasks();
};

function mockCreateLayerTasks(): void {
  const idBuilder = {
    counter: 0,
  };
  createLayerTasksMock.mockImplementation((metaData: LayerMetadata, ranges: ITaskZoomRange[]) => {
    return ranges.map((range) => {
      const req = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        discrete_id: metaData.source,
        version: metaData.version,
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
mockCreateLayerTasks();
export { tiller, storage, mapPublisher, logger, resetMocks };
