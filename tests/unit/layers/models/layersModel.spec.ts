import { IngestionParams, LayerMetadata, ProductType, RecordType } from '@map-colonies/mc-model-types';
import { LayersManager } from '../../../../src/layers/models/layersManager';
import { createLayerJobMock, findJobsMock, jobManagerClientMock, createTasksMock } from '../../../mocks/clients/jobManagerClient';
import { catalogExistsMock, catalogClientMock, getLayerVersionsMock } from '../../../mocks/clients/catalogClient';
import { mapPublisherClientMock, mapExistsMock } from '../../../mocks/clients/mapPublisherClient';
import { init as initMockConfig, configMock, setValue, clear as clearMockConfig } from '../../../mocks/config';
import { logger } from '../../../mocks/logger';
import { fileValidatorValidateExistsMock, validateGpkgFilesMock, fileValidatorMock } from '../../../mocks/fileValidator';
import { ConflictError } from '../../../../src/common/exceptions/http/conflictError';
import { BadRequestError } from '../../../../src/common/exceptions/http/badRequestError';
import { OperationStatus } from '../../../../src/common/enums';
import { ZoomLevelCalculator } from '../../../../src/utils/zoomToResolution';
import { createIngestionTaskMock, generateTasksParametersMock, taskerMock } from '../../../mocks/tasker';
import { createMergeTaskMock, mergeTaskerMock } from '../../../mocks/mergeTasker';

let layersManager: LayersManager;
let checkForUpdateSpy: jest.SpyInstance;
let createTasksSpy: jest.SpyInstance;

const testImageMetadata: LayerMetadata = {
  productId: 'test',
  productVersion: '1.22',
  productName: 'test name',
  description: 'test desc',
  minHorizontalAccuracyCE90: 3,
  maxResolutionDeg: 2.68220901489258e-6,
  rms: 0.5,
  scale: 3,
  sensors: ['OTHER', 'Test'],
  updateDate: new Date('01/01/2020'),
  footprint: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
        [0, 0],
      ],
    ],
  },
  classification: '',
  creationDate: new Date('02/01/2020'),
  ingestionDate: new Date('03/01/2020'),
  producerName: 'testProducer',
  productType: ProductType.ORTHOPHOTO_HISTORY,
  productSubType: undefined,
  region: ['testRegion1', 'testRegion2'],
  sourceDateEnd: new Date('06/01/2020'),
  sourceDateStart: new Date('05/01/2020'),
  srsId: '4326',
  srsName: 'WGS84GEO',
  type: RecordType.RECORD_RASTER,
  layerPolygonParts: undefined,
  includedInBests: undefined,
  maxResolutionMeter: 0.2,
  productBoundingBox: undefined,
  rawProductData: undefined,
};
const layerRelativePath = 'test/OrthophotoHistory';
const testData: IngestionParams = {
  fileNames: [],
  metadata: testImageMetadata,
  originDirectory: '/here',
};

describe('LayersManager', () => {
  beforeEach(function () {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    clearMockConfig();
    initMockConfig();
    checkForUpdateSpy = jest.spyOn(LayersManager.prototype, 'checkForUpdate');
    
  });

  describe('createLayer', () => {
    it('saves metadata before queueing ingestion tasks', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      setValue('tasksBatchSize', 2);

      getLayerVersionsMock.mockResolvedValue([]);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);
      createLayerJobMock.mockResolvedValue('testJobId');
      validateGpkgFilesMock.mockResolvedValue(false);
      createIngestionTaskMock.mockResolvedValue(undefined);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      await layersManager.createLayer(testData);

      expect(getLayerVersionsMock).toHaveBeenCalledTimes(1);
      expect(checkForUpdateSpy).toHaveBeenCalledTimes(1);
      expect(createIngestionTaskMock).toHaveBeenCalledTimes(1);
    });

    it('saves metadata before queueing merge tasks if all files are gpkg', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      setValue('tasksBatchSize', 2);
      const testData: IngestionParams = {
        fileNames: ['test.gpkg'],
        metadata: testImageMetadata,
        originDirectory: '/here',
      };

      getLayerVersionsMock.mockResolvedValue([0.5]);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);
      createLayerJobMock.mockResolvedValue('testJobId');
      validateGpkgFilesMock.mockResolvedValue(true);
      createIngestionTaskMock.mockResolvedValue(undefined);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      await layersManager.createLayer(testData);

      expect(getLayerVersionsMock).toHaveBeenCalledTimes(1);
      expect(checkForUpdateSpy).toHaveBeenCalledTimes(1);
      expect(createMergeTaskMock).toHaveBeenCalledTimes(1);
    });

    it('should failed if higher product version is exists in catalog', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      setValue('tasksBatchSize', 2);

      getLayerVersionsMock.mockResolvedValue([2.5]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(1);
    });

    it('should failed if there is unsupported file (not GPKG) in request', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      setValue('tasksBatchSize', 2);

      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: testImageMetadata,
        originDirectory: '/here',
      };
      getLayerVersionsMock.mockResolvedValue([2.5]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(1);
    });

    it('fail if layer status is pending', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.PENDING }]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('fail if layer status is inProgress', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.IN_PROGRESS }]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('pass if layer status is completed', async function () {
      const taskParams = [
        {
          discreteId: 'testid1',
          version: '1.0',
          fileNames: ['file1.test1'],
          originDirectory: 'test1-dir',
          minZoom: 1,
          maxZoom: 1,
          layerRelativePath: layerRelativePath,
          bbox: [0, 0, 90, 90],
        },
      ];

      setValue({ 'tiling.zoomGroups': '1' });
      checkForUpdateSpy.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.COMPLETED }]);
      generateTasksParametersMock.mockReturnValue(taskParams);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action()).resolves.not.toThrow();
    });

    it('pass if layer status is failed', async function () {
      const taskParams = [
        {
          discreteId: 'testid1',
          version: '1.0',
          fileNames: ['file1.test1'],
          originDirectory: 'test1-dir',
          minZoom: 1,
          maxZoom: 1,
          layerRelativePath: layerRelativePath,
          bbox: [0, 0, 90, 90],
        },
      ];
      setValue({ 'tiling.zoomGroups': '1' });
      checkForUpdateSpy.mockResolvedValue(false);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.FAILED }]);
      generateTasksParametersMock.mockReturnValue(taskParams);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action()).resolves.not.toThrow();
    });

    it('fail if layer exists in mapping server', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      checkForUpdateSpy.mockResolvedValue(false);
      mapExistsMock.mockResolvedValue(true);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('fail if layer exists in catalog', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      checkForUpdateSpy.mockResolvedValue(false);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(true);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('fail if files are missing', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      checkForUpdateSpy.mockResolvedValue(false);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(false);
      findJobsMock.mockResolvedValue([]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        taskerMock,
        mergeTaskerMock
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(BadRequestError);
    });
  });

  it('fail if layer exists in catalog', async function () {
    setValue({ 'tiling.zoomGroups': '1' });
    checkForUpdateSpy.mockResolvedValue(false);
    mapExistsMock.mockResolvedValue(false);
    catalogExistsMock.mockResolvedValue(true);
    fileValidatorValidateExistsMock.mockResolvedValue(true);
    findJobsMock.mockResolvedValue([]);

    const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
    layersManager = new LayersManager(
      logger,
      zoomLevelCalculator,
      jobManagerClientMock,
      catalogClientMock,
      mapPublisherClientMock,
      fileValidatorMock,
      taskerMock,
      mergeTaskerMock
    );

    const action = async () => {
      await layersManager.createLayer(testData);
    };
    await expect(action).rejects.toThrow(ConflictError);
  });
});
