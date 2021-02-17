import { IConfig, ILogger } from '../../../../src/common/interfaces';
import { ITaskId } from '../../../../src/tasks/interfaces';
import { TasksManager } from '../../../../src/tasks/models/tasksManager';
import { MapPublisherClient } from '../../../../src/serviceClients/mapPublisherClient';
import { StorageClient } from '../../../../src/serviceClients/storageClient';

let tasksManager: TasksManager;

//storage client mock
const getCompletedZoomLevelsMock = jest.fn();
const updateTaskStatusMock = jest.fn();
const dbMock = ({
  getCompletedZoomLevels: getCompletedZoomLevelsMock,
  updateTaskStatus: updateTaskStatusMock,
} as unknown) as StorageClient;

//publisher client mock
const publishLayerMock = jest.fn();
const publisherMock = ({
  publishLayer: publishLayerMock,
} as unknown) as MapPublisherClient;

//catalog mock
//TODO: add catalog
//const publishToCatalogMock = jest.fn();

//logger mock
const logMock = jest.fn();
const loggerMock = {
  log: logMock,
} as ILogger;

//config mock
const configGetMock = jest.fn();
const configMock = ({
  get: configGetMock,
} as unknown) as IConfig;

//TODO: update when model updates
const testData: ITaskId = {
  id: 'test',
  version: '1',
};
describe('TasksManager', () => {
  beforeEach(function () {
    jest.resetAllMocks();
  });

  describe('completeWorkerTask', () => {
    it('publish layer if all tasks are done', async function () {
      configGetMock.mockReturnValue('0-10,11,12,13,14,15,16,17,18');
      getCompletedZoomLevelsMock.mockReturnValue({
        completed: true,
        successful: true,
        metaData: {
          dsc: 'test desc',
          source: 'test',
          version: '1',
        },
      });
      tasksManager = new TasksManager(loggerMock, configMock, dbMock, publisherMock);

      await tasksManager.taskComplete(testData);

      expect(getCompletedZoomLevelsMock).toHaveBeenCalledTimes(1);
      //expect(publishToCatalogMock).toHaveBeenCalledTimes(1);
      expect(publishLayerMock).toHaveBeenCalledTimes(1);
      const expectedPublishReq = {
        description: 'test desc',
        maxZoomLevel: 18,
        name: 'test-1',
        tilesPath: 'test/1',
      };
      expect(publishLayerMock).toHaveBeenCalledWith(expectedPublishReq);
    });

    it('do nothing if some tasks are not done', async function () {
      configGetMock.mockReturnValue('');
      getCompletedZoomLevelsMock.mockReturnValue({
        allCompleted: false,
      });
      tasksManager = new TasksManager(loggerMock, configMock, dbMock, publisherMock);

      await tasksManager.taskComplete(testData);

      expect(getCompletedZoomLevelsMock).toHaveBeenCalledTimes(1);
      //expect(publishToCatalogMock).toHaveBeenCalledTimes(0);
      expect(publishLayerMock).toHaveBeenCalledTimes(0);
    });
  });
});
