import { ProductType } from '@map-colonies/mc-model-types';
import { TasksManager } from '../../../../src/tasks/models/tasksManager';
import { jobManagerClientMock, getJobStatusMock, getTaskMock, abortJobMock, updateJobStatusMock } from '../../../mocks/clients/jobManagerClient';
import { mapPublisherClientMock, publishLayerMock } from '../../../mocks/clients/mapPublisherClient';
import { catalogClientMock, findRecordMock, publishToCatalogMock, updateMock } from '../../../mocks/clients/catalogClient';
import { syncClientMock, triggerSyncMock } from '../../../mocks/clients/syncClient';
import { configMock, init as initMockConfig, setValue } from '../../../mocks/config';
import { linkBuilderMock } from '../../../mocks/linkBuilder';
import { logger } from '../../../mocks/logger';
import { OperationTypeEnum } from '../../../../src/serviceClients/syncClient';
import { OperationStatus } from '../../../../src/common/enums';
import { mergeMock, metadataMergerMock } from '../../../mocks/metadataMerger';

let tasksManager: TasksManager;

const jobId = 'c3e8d0c6-6663-49e5-9257-323674161725';
const taskId = '517059cc-f60b-4542-8a41-fdd163358d74';

describe('TasksManager', () => {
  const ingestionNewJobType = 'IngestionNew';
  const ingestionUpdateJobType = 'MeregNew';
  const tileSplitTask = 'SplitNew';
  const tileMergeTask = 'MergeNew';
  beforeEach(function () {
    jest.resetAllMocks();
    initMockConfig();
  });

  describe('completeWorkerTask', () => {
    const testMetadata = {
      description: 'test desc',
      productType: ProductType.ORTHOPHOTO_HISTORY,
      productName: 'test',
      productVersion: '1',
      productId: 'test',
      maxResolutionDeg: 2.68220901489258e-6,
    };

    const mapPublishReq = {
      maxZoomLevel: 18,
      name: `test-${testMetadata.productType}`,
      tilesPath: `test/${testMetadata.productType}`,
      cacheType: 'file',
    };

    const catalogReqData = {
      metadata: { ...testMetadata },
      links: undefined,
    };

    it('publish layer to catalog twice if all tasks are done for ORTHOPHOTO_HISTORY', async function () {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      setValue({ mapServerCacheType: 'fs', 'tiling.zoomGroups': '0-10,11,12,13,14,15,16,17,18' });
      setValue('shouldSync', true);
      setValue('ingestionNewJobType', ingestionNewJobType);
      setValue('ingestionTaskType', { tileMergeTask, tileSplitTask });

      getJobStatusMock.mockReturnValue({
        isCompleted: true,
        isSuccessful: true,
        metadata: testMetadata,
        relativePath: `test/${ProductType.ORTHOPHOTO_HISTORY}`,
        type: ingestionNewJobType,
      });

      getTaskMock.mockReturnValue({
        id: taskId,
        jobId: jobId,
        type: tileSplitTask,
      });

      tasksManager = new TasksManager(
        logger,
        configMock,
        syncClientMock,
        jobManagerClientMock,
        mapPublisherClientMock,
        catalogClientMock,
        linkBuilderMock,
        metadataMergerMock
      );

      await tasksManager.taskComplete(jobId, taskId);

      expect(getJobStatusMock).toHaveBeenCalledTimes(1);
      expect(publishToCatalogMock).toHaveBeenCalledTimes(1);
      expect(publishLayerMock).toHaveBeenCalledTimes(1);

      expect(triggerSyncMock).toHaveBeenCalledTimes(1);
      expect(publishLayerMock).toHaveBeenCalledWith(mapPublishReq);
      expect(publishToCatalogMock).toHaveBeenCalledWith(catalogReqData);
      expect(triggerSyncMock).toHaveBeenCalledWith('test', '1', ProductType.ORTHOPHOTO_HISTORY, OperationTypeEnum.ADD, mapPublishReq.tilesPath);
    });

    it('publish layer to catalog once if all tasks are done for RASTER_MAP', async function () {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      setValue({ mapServerCacheType: 'fs', 'tiling.zoomGroups': '0-10,11,12,13,14,15,16,17,18' });
      setValue('shouldSync', true);
      setValue('ingestionNewJobType', ingestionNewJobType);
      setValue('ingestionTaskType', { tileMergeTask, tileSplitTask });

      const rasterMapTestData = { ...testMetadata };
      rasterMapTestData.productType = ProductType.RASTER_MAP;

      getJobStatusMock.mockReturnValue({
        isCompleted: true,
        isSuccessful: true,
        metadata: rasterMapTestData,
        relativePath: `test/${ProductType.RASTER_MAP}`,
        type: ingestionNewJobType,
      });

      getTaskMock.mockReturnValue({
        id: taskId,
        jobId: jobId,
        type: tileSplitTask,
      });

      tasksManager = new TasksManager(
        logger,
        configMock,
        syncClientMock,
        jobManagerClientMock,
        mapPublisherClientMock,
        catalogClientMock,
        linkBuilderMock,
        metadataMergerMock
      );

      await tasksManager.taskComplete(jobId, taskId);

      expect(getJobStatusMock).toHaveBeenCalledTimes(1);
      expect(publishToCatalogMock).toHaveBeenCalledTimes(1);
      expect(publishLayerMock).toHaveBeenCalledTimes(1);

      expect(triggerSyncMock).toHaveBeenCalledTimes(1);
      const mapPublishReqForRasterMap = { ...mapPublishReq };
      mapPublishReqForRasterMap.name = `test-${rasterMapTestData.productType}`;
      mapPublishReqForRasterMap.tilesPath = `test/${rasterMapTestData.productType}`;
      expect(publishLayerMock).toHaveBeenCalledWith(mapPublishReqForRasterMap);

      const expectedPublishTocCatalogReq = { ...catalogReqData };
      expectedPublishTocCatalogReq.metadata.productType = ProductType.RASTER_MAP;
      expect(publishToCatalogMock).toHaveBeenCalledWith(expectedPublishTocCatalogReq);
      expect(triggerSyncMock).toHaveBeenCalledWith('test', '1', ProductType.RASTER_MAP, OperationTypeEnum.ADD, mapPublishReqForRasterMap.tilesPath);
    });

    it('do nothing if some tasks are not done', async function () {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      setValue({ mapServerCacheType: 'fs', 'tiling.zoomGroups': '' });
      setValue('ingestionNewJobType', ingestionNewJobType);
      setValue('ingestionTaskType', { tileMergeTask, tileSplitTask });

      getJobStatusMock.mockReturnValue({
        allCompleted: false,
        type: ingestionNewJobType,
      });

      getTaskMock.mockReturnValue({
        type: tileSplitTask,
      });

      tasksManager = new TasksManager(
        logger,
        configMock,
        syncClientMock,
        jobManagerClientMock,
        mapPublisherClientMock,
        catalogClientMock,
        linkBuilderMock,
        metadataMergerMock
      );

      await tasksManager.taskComplete(jobId, taskId);

      expect(getJobStatusMock).toHaveBeenCalledTimes(1);
      expect(publishToCatalogMock).toHaveBeenCalledTimes(0);
      expect(publishLayerMock).toHaveBeenCalledTimes(0);
      expect(triggerSyncMock).toHaveBeenCalledTimes(0);
    });

    it('should abort all merge tasks and make job failed on task failure', async function () {
      setValue('ingestionUpdateJobType', ingestionUpdateJobType);
      setValue('ingestionTaskType', { tileMergeTask, tileSplitTask });

      const rasterMapTestData = { ...testMetadata };
      rasterMapTestData.productType = ProductType.RASTER_MAP;

      getJobStatusMock.mockReturnValue({
        id: jobId,
        completed: true,
        successful: true,
        relativePath: `test/${ProductType.RASTER_MAP}`,
        metadata: rasterMapTestData,
        type: ingestionUpdateJobType,
      });

      getTaskMock.mockReturnValue({
        id: taskId,
        jobId: jobId,
        type: tileMergeTask,
        status: OperationStatus.FAILED,
      });

      tasksManager = new TasksManager(
        logger,
        configMock,
        syncClientMock,
        jobManagerClientMock,
        mapPublisherClientMock,
        catalogClientMock,
        linkBuilderMock,
        metadataMergerMock
      );

      // eslint-disable-next-line @typescript-eslint/ban-types
      const tasksManagerWithHandlers = tasksManager as unknown as { handleUpdateIngestion: () => {}; handleNewIngestion: () => {} };
      const handleUpdateIngestionSpy = jest.spyOn(tasksManagerWithHandlers, 'handleUpdateIngestion');
      const handleNewIngestionSpy = jest.spyOn(tasksManagerWithHandlers, 'handleNewIngestion');
      await tasksManager.taskComplete(jobId, taskId);

      expect(abortJobMock).toHaveBeenCalledTimes(1);
      expect(updateJobStatusMock).toHaveBeenCalledTimes(1);
      expect(updateJobStatusMock).toHaveBeenCalledWith(jobId, OperationStatus.FAILED, `Failed to update ingestion`);
      expect(handleUpdateIngestionSpy).toHaveBeenCalledTimes(1);
      expect(handleNewIngestionSpy).toHaveBeenCalledTimes(0);
    });

    it('should complete job once all tasks are successful for update-merge job-task', async function () {
      setValue('ingestionUpdateJobType', ingestionUpdateJobType);
      setValue('ingestionTaskType', { tileMergeTask, tileSplitTask });

      const rasterMapTestData = { ...testMetadata };
      rasterMapTestData.productType = ProductType.RASTER_MAP;

      getJobStatusMock.mockReturnValue({
        id: jobId,
        isCompleted: true,
        isSuccessful: true,
        relativePath: `test/${ProductType.RASTER_MAP}`,
        metadata: rasterMapTestData,
        type: ingestionUpdateJobType,
        successTasksCount: 3,
      });

      getTaskMock.mockReturnValue({
        id: taskId,
        jobId: jobId,
        type: tileMergeTask,
        status: OperationStatus.COMPLETED,
      });

      const catalogRecordId = 'a6fbf0dc-d82c-4c8d-ad28-b8f56c685a23';
      findRecordMock.mockResolvedValue({
        id: catalogRecordId,
        metadata: {},
      });

      tasksManager = new TasksManager(
        logger,
        configMock,
        syncClientMock,
        jobManagerClientMock,
        mapPublisherClientMock,
        catalogClientMock,
        linkBuilderMock,
        metadataMergerMock
      );

      await tasksManager.taskComplete(jobId, taskId);

      expect(updateJobStatusMock).toHaveBeenCalledTimes(1);
      expect(updateJobStatusMock).toHaveBeenCalledWith(jobId, OperationStatus.COMPLETED, undefined, catalogRecordId);
      expect(mergeMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(findRecordMock).toHaveBeenCalledTimes(1);
    });
  });
});
