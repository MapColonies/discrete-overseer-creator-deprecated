import { ProductType } from '@map-colonies/mc-model-types';
import { TasksManager } from '../../../../src/tasks/models/tasksManager';
import { dbClientMock, getCompletedZoomLevelsMock } from '../../../mocks/clients/storageClient';
import { mapPublisherClientMock, publishLayerMock } from '../../../mocks/clients/mapPublisherClient';
import { catalogClientMock, publishToCatalogMock } from '../../../mocks/clients/catalogClient';
import { syncClientMock, triggerSyncMock } from '../../../mocks/clients/syncClient';
import { configMock, init as initMockConfig, setValue } from '../../../mocks/config';
import { linkBuilderMock } from '../../../mocks/linkBuilder';
import { logger } from '../../../mocks/logger';
import { ZoomLevelCalculator } from '../../../../src/utils/zoomToResolution';
import { OperationTypeEnum, SyncTypeEnum } from '../../../../src/serviceClients/syncClient';

let tasksManager: TasksManager;

const jobId = 'c3e8d0c6-6663-49e5-9257-323674161725';
const taskId = '517059cc-f60b-4542-8a41-fdd163358d74';

describe('TasksManager', () => {
  beforeEach(function () {
    jest.resetAllMocks();
    initMockConfig();
  });

  describe('completeWorkerTask', () => {
    const testMetadata = {
      description: 'test desc',
      productType: ProductType.ORTHOPHOTO_HISTORY,
      productName: 'test-1',
      productVersion: '1',
      productId: 'test',
      resolution: 2.68220901489258e-6,
    };

    const mapPublishReq = {
      description: 'test desc',
      maxZoomLevel: 18,
      name: `test-1-${ProductType.ORTHOPHOTO_HISTORY}`,
      tilesPath: 'test/1',
      cacheType: 'file',
    };

    const catalogReqData = {
      metadata: { ...testMetadata },
      links: undefined,
    };

    it('publish layer to catalog twice if all tasks are done for ORTHOPHOTO_HISTORY', async function () {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      setValue({ StorageProvider: 'fs', 'tiling.zoomGroups': '0-10,11,12,13,14,15,16,17,18' });

      getCompletedZoomLevelsMock.mockReturnValue({
        completed: true,
        successful: true,
        metadata: testMetadata,
      });

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      tasksManager = new TasksManager(
        logger,
        configMock,
        syncClientMock,
        zoomLevelCalculator,
        dbClientMock,
        mapPublisherClientMock,
        catalogClientMock,
        linkBuilderMock
      );

      await tasksManager.taskComplete(jobId, taskId);

      expect(getCompletedZoomLevelsMock).toHaveBeenCalledTimes(1);
      expect(publishToCatalogMock).toHaveBeenCalledTimes(2);
      expect(publishLayerMock).toHaveBeenCalledTimes(2);

      expect(triggerSyncMock).toHaveBeenCalledTimes(1);
      expect(publishLayerMock).toHaveBeenCalledWith(mapPublishReq);
      const expectedPublishReqSecond = { ...mapPublishReq };
      expectedPublishReqSecond.name = `test-1-${ProductType.ORTHOPHOTO}`;
      expect(publishLayerMock).toHaveBeenCalledWith(mapPublishReq);
      expect(publishLayerMock).toHaveBeenCalledWith(expectedPublishReqSecond);

      const expectedPublishTocCatalogReqFirst = { ...catalogReqData };
      expectedPublishTocCatalogReqFirst.metadata.productType = ProductType.ORTHOPHOTO;
      expect(publishToCatalogMock).toHaveBeenCalledWith(catalogReqData);
      expect(publishToCatalogMock).toHaveBeenCalledWith(expectedPublishTocCatalogReqFirst);
      expect(triggerSyncMock).toHaveBeenCalledWith('test', '1', SyncTypeEnum.NEW_DISCRETE, OperationTypeEnum.ADD);
    });

    it('publish layer to catalog once if all tasks are done for RASTER_MAP', async function () {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      setValue({ StorageProvider: 'fs', 'tiling.zoomGroups': '0-10,11,12,13,14,15,16,17,18' });

      const rasterMapTestData = { ...testMetadata };
      rasterMapTestData.productType = ProductType.RASTER_MAP;

      getCompletedZoomLevelsMock.mockReturnValue({
        completed: true,
        successful: true,
        metadata: rasterMapTestData,
      });

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      tasksManager = new TasksManager(
        logger,
        configMock,
        syncClientMock,
        zoomLevelCalculator,
        dbClientMock,
        mapPublisherClientMock,
        catalogClientMock,
        linkBuilderMock
      );

      await tasksManager.taskComplete(jobId, taskId);

      expect(getCompletedZoomLevelsMock).toHaveBeenCalledTimes(1);
      expect(publishToCatalogMock).toHaveBeenCalledTimes(1);
      expect(publishLayerMock).toHaveBeenCalledTimes(1);

      expect(triggerSyncMock).toHaveBeenCalledTimes(1);
      const mapPublishReqForRasterMap = { ...mapPublishReq };
      mapPublishReqForRasterMap.name = `test-1-${ProductType.RASTER_MAP}`;
      expect(publishLayerMock).toHaveBeenCalledWith(mapPublishReqForRasterMap);

      const expectedPublishTocCatalogReq = { ...catalogReqData };
      expectedPublishTocCatalogReq.metadata.productType = ProductType.RASTER_MAP;
      expect(publishToCatalogMock).toHaveBeenCalledWith(expectedPublishTocCatalogReq);
      expect(triggerSyncMock).toHaveBeenCalledWith('test', '1', SyncTypeEnum.NEW_DISCRETE, OperationTypeEnum.ADD);
    });

    it('do nothing if some tasks are not done', async function () {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      setValue({ StorageProvider: 'fs', 'tiling.zoomGroups': '' });

      getCompletedZoomLevelsMock.mockReturnValue({
        allCompleted: false,
      });

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      tasksManager = new TasksManager(
        logger,
        configMock,
        syncClientMock,
        zoomLevelCalculator,
        dbClientMock,
        mapPublisherClientMock,
        catalogClientMock,
        linkBuilderMock
      );

      await tasksManager.taskComplete(jobId, taskId);

      expect(getCompletedZoomLevelsMock).toHaveBeenCalledTimes(1);
      expect(publishToCatalogMock).toHaveBeenCalledTimes(0);
      expect(publishLayerMock).toHaveBeenCalledTimes(0);
      expect(triggerSyncMock).toHaveBeenCalledTimes(0);
    });
  });
});
