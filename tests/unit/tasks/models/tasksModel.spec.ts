import { TasksManager } from '../../../../src/tasks/models/tasksManager';
import { dbClientMock, getCompletedZoomLevelsMock } from '../../../mocks/clients/storageClient';
import { mapPublisherClientMock, publishLayerMock } from '../../../mocks/clients/mapPublisherClient';
import { catalogClientMock, publishToCatalogMock } from '../../../mocks/clients/catalogClient';
import { syncClientMock, triggerSyncMock } from '../../../mocks/clients/syncClient';
import { configMock, getMock as configGetMock } from '../../../mocks/config';
import { linkBuilderMock } from '../../../mocks/linkBuilder';
import { logger } from '../../../mocks/logger';
import { ZoomLevelCalculateor } from '../../../../src/utils/zoomToResulation';
import { OperationTypeEnum, SyncTypeEnum } from '../../../../src/serviceClients/syncClient';

let tasksManager: TasksManager;

const jobId = 'c3e8d0c6-6663-49e5-9257-323674161725';
const taskId = '517059cc-f60b-4542-8a41-fdd163358d74';

describe('TasksManager', () => {
  beforeEach(function () {
    jest.resetAllMocks();
  });

  describe('completeWorkerTask', () => {
    it('publish layer if all tasks are done', async function () {
      getCompletedZoomLevelsMock.mockReturnValue({
        completed: true,
        successful: true,
        metadata: {
          description: 'test desc',
          productName: 'test-1',
          productVersion: '1',
          productId: 'test',
          resolution: 2.68220901489258e-6,
        },
      });
      configGetMock.mockReturnValue('fs');
      const zoomLevelCalculateor = new ZoomLevelCalculateor(logger, configMock);
      tasksManager = new TasksManager(
        logger,
        configMock,
        syncClientMock,
        zoomLevelCalculateor,
        dbClientMock,
        mapPublisherClientMock,
        catalogClientMock,
        linkBuilderMock
      );
      configGetMock.mockReturnValue('0-10,11,12,13,14,15,16,17,18');

      await tasksManager.taskComplete(jobId, taskId);

      expect(getCompletedZoomLevelsMock).toHaveBeenCalledTimes(1);
      expect(publishToCatalogMock).toHaveBeenCalledTimes(1);
      expect(publishLayerMock).toHaveBeenCalledTimes(1);
      expect(triggerSyncMock).toHaveBeenCalledTimes(1);
      const expectedPublishReq = {
        description: 'test desc',
        maxZoomLevel: 18,
        name: 'test-1',
        tilesPath: 'test/1',
        cacheType: 'file',
      };
      expect(publishLayerMock).toHaveBeenCalledWith(expectedPublishReq);
      expect(triggerSyncMock).toHaveBeenCalledWith('test', '1', SyncTypeEnum.NEW_DISCRETE, OperationTypeEnum.ADD);
    });

    it('do nothing if some tasks are not done', async function () {
      getCompletedZoomLevelsMock.mockReturnValue({
        allCompleted: false,
      });
      configGetMock.mockReturnValue('fs');
      const zoomLevelCalculateor = new ZoomLevelCalculateor(logger, configMock);
      tasksManager = new TasksManager(
        logger,
        configMock,
        syncClientMock,
        zoomLevelCalculateor,
        dbClientMock,
        mapPublisherClientMock,
        catalogClientMock,
        linkBuilderMock
      );
      configGetMock.mockReturnValue('');

      await tasksManager.taskComplete(jobId, taskId);

      expect(getCompletedZoomLevelsMock).toHaveBeenCalledTimes(1);
      expect(publishToCatalogMock).toHaveBeenCalledTimes(0);
      expect(publishLayerMock).toHaveBeenCalledTimes(0);
      expect(triggerSyncMock).toHaveBeenCalledTimes(0);
    });
  });
});
