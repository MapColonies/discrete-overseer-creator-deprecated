import { ILogger } from '../../../../../src/common/interfaces';
import { ITaskId } from '../../../../../src/tasks/interfaces';
import { TasksManager } from '../../../../../src/tasks/models/tasksManager';
import { PublisherClient } from '../../../../../src/serviceClients/publisherClient';
import { StorageClient } from '../../../../../src/serviceClients/storageClient';

let tasksManager: TasksManager;

//storage client mock
const getCompletedZoomLevelsMock = jest.fn();
const publishToCatalogMock = jest.fn();
const dbMock = ({
  getCompletedZoomLevels: getCompletedZoomLevelsMock,
  publishToCatalog: publishToCatalogMock,
} as unknown) as StorageClient;

//publisher client mock
const publishLayerMock = jest.fn();
const publisherMock = ({
  publishLayer: publishLayerMock,
} as unknown) as PublisherClient;

//logger mock
const logMock = jest.fn();
const loggerMock = {
  log: logMock,
} as ILogger;

//TODO: update when model updates
const testData: ITaskId = {
  id: 'test',
  version: '1',
};
describe('TasksManager', () => {
  beforeEach(function () {
    getCompletedZoomLevelsMock.mockReset();
    publishToCatalogMock.mockReset();
    publishLayerMock.mockReset();
    logMock.mockReset();
  });

  describe('completeWorkerTask', () => {
    it('publish layer if all tasks are done', async function () {
      getCompletedZoomLevelsMock.mockReturnValue({
        allCompleted: true,
      });
      tasksManager = new TasksManager(loggerMock, dbMock, publisherMock);

      await tasksManager.taskComplete(testData);

      expect(getCompletedZoomLevelsMock).toHaveBeenCalledTimes(1);
      expect(publishToCatalogMock).toHaveBeenCalledTimes(1);
      expect(publishLayerMock).toHaveBeenCalledTimes(1);
    });

    it('do nothing if some tasks are not done', async function () {
      getCompletedZoomLevelsMock.mockReturnValue({
        allCompleted: false,
      });
      tasksManager = new TasksManager(loggerMock, dbMock, publisherMock);

      await tasksManager.taskComplete(testData);

      expect(getCompletedZoomLevelsMock).toHaveBeenCalledTimes(1);
      expect(publishToCatalogMock).toHaveBeenCalledTimes(0);
      expect(publishLayerMock).toHaveBeenCalledTimes(0);
    });
  });
});
