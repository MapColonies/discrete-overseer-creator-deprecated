import { IngestionParams, LayerMetadata, ProductType, RecordType } from '@map-colonies/mc-model-types';
import { LayersManager } from '../../../../src/layers/models/layersManager';
import { createLayerJobMock, findJobsMock, jobManagerClientMock } from '../../../mocks/clients/jobManagerClient';
import { catalogExistsMock, catalogClientMock, getHighestLayerVersionMock } from '../../../mocks/clients/catalogClient';
import { mapPublisherClientMock, mapExistsMock } from '../../../mocks/clients/mapPublisherClient';
import { init as initMockConfig, configMock, setValue, clear as clearMockConfig } from '../../../mocks/config';
import { logger } from '../../../mocks/logger';
import { fileValidatorValidateExistsMock, validateGpkgFilesMock, fileValidatorMock } from '../../../mocks/fileValidator';
import { ConflictError } from '../../../../src/common/exceptions/http/conflictError';
import { BadRequestError } from '../../../../src/common/exceptions/http/badRequestError';
import { OperationStatus } from '../../../../src/common/enums';
import { ZoomLevelCalculator } from '../../../../src/utils/zoomToResolution';
import { createSplitTilesTasksMock, generateTasksParametersMock, splitTilesTaskerMock } from '../../../mocks/splitTilesTasker';
import { createMergeTilesTasksMock, mergeTilesTasker } from '../../../mocks/mergeTilesTasker';
import { SQLiteClient } from '../../../../src/serviceClients/sqliteClient';
import { Grid } from '../../../../src/layers/interfaces';

let layersManager: LayersManager;

const testImageMetadata = {
  productId: 'test',
  productVersion: '3.0',
  productName: 'test name',
  description: 'test desc',
  minHorizontalAccuracyCE90: 3,
  maxResolutionDeg: 2.68220901489258e-6,
  rms: 0.5,
  scale: 3,
  sensors: ['OTHER', 'Test'],
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
} as unknown as LayerMetadata;
const layerRelativePath = 'test/OrthophotoHistory';

describe('LayersManager', () => {
  beforeEach(function () {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    clearMockConfig();
    initMockConfig();
  });

  describe('createLayer', () => {
    it('should create "New" job type with "Split-Tiles" task type successfully', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      setValue('ingestionTilesSplittingTiles.tasksBatchSize', 2);
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      getHighestLayerVersionMock.mockResolvedValue(undefined);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);
      createLayerJobMock.mockResolvedValue('testJobId');
      createSplitTilesTasksMock.mockResolvedValue(undefined);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      await layersManager.createLayer(testData);
      expect(getHighestLayerVersionMock).toHaveBeenCalledTimes(1);
      expect(fileValidatorValidateExistsMock).toHaveBeenCalledTimes(1);
      expect(findJobsMock).toHaveBeenCalledTimes(1);
      expect(createSplitTilesTasksMock).toHaveBeenCalledTimes(1);
    });

    it('should create "Update" job type with "Merge-Tiles" task type successfully when includes only GPKG files', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      setValue('ingestionTilesSplittingTiles.tasksBatchSize', 2);
      const testData: IngestionParams = {
        fileNames: ['test.gpkg'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };
      const getGridSpy = jest.spyOn(SQLiteClient.prototype, 'getGrid');
      getGridSpy.mockReturnValue(Grid.TWO_ON_ONE);
      getHighestLayerVersionMock.mockResolvedValue(2.0);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      mapExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);
      validateGpkgFilesMock.mockReturnValue(true);
      createLayerJobMock.mockResolvedValue('testJobId');
      createMergeTilesTasksMock.mockResolvedValue(undefined);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      await layersManager.createLayer(testData);

      expect(getHighestLayerVersionMock).toHaveBeenCalledTimes(1);
      expect(fileValidatorValidateExistsMock).toHaveBeenCalledTimes(1);
      expect(findJobsMock).toHaveBeenCalledTimes(1);
      expect(validateGpkgFilesMock).toHaveBeenCalledTimes(1);
      expect(createMergeTilesTasksMock).toHaveBeenCalledTimes(1);
    });

    it('should throw Bad Request Error for "Update" job type if layer is not exists in map proxy', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      setValue('ingestionTilesSplittingTiles.tasksBatchSize', 2);
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      getHighestLayerVersionMock.mockResolvedValue([1.0, 2.0]);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      mapExistsMock.mockResolvedValue(false);
      findJobsMock.mockResolvedValue([]);
      validateGpkgFilesMock.mockReturnValue(true);
      createLayerJobMock.mockResolvedValue('testJobId');
      createMergeTilesTasksMock.mockResolvedValue(undefined);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(getHighestLayerVersionMock).toHaveBeenCalledTimes(1);
      expect(fileValidatorValidateExistsMock).toHaveBeenCalledTimes(1);
      expect(findJobsMock).toHaveBeenCalledTimes(1);
    });

    it('should throw Bad Request Error for "New" or "Update" job type if higher product version is already exists in catalog', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      setValue('ingestionTilesSplittingTiles.tasksBatchSize', 2);
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      getHighestLayerVersionMock.mockResolvedValue(4.0);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(fileValidatorValidateExistsMock).toHaveBeenCalledTimes(1);
      expect(getHighestLayerVersionMock).toHaveBeenCalledTimes(0);
      expect(findJobsMock).toHaveBeenCalledTimes(0);
      expect(createSplitTilesTasksMock).toHaveBeenCalledTimes(0);
    });

    // TODO: Handle test when update is supported for other formats
    it('should throw Bad Request Error for "Update" job type if there is unsupported file (not GPKG) in request', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      setValue('ingestionTilesSplittingTiles.tasksBatchSize', 2);
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      getHighestLayerVersionMock.mockResolvedValue(2.5);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);
      validateGpkgFilesMock.mockReturnValue(false);
      createLayerJobMock.mockResolvedValue('testJobId');
      createMergeTilesTasksMock.mockResolvedValue(undefined);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };

      await expect(action).rejects.toThrow(BadRequestError);
      expect(getHighestLayerVersionMock).toHaveBeenCalledTimes(1);
    });

    it('fail if layer status is pending', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.PENDING }]);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('fail if layer status is inProgress', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.IN_PROGRESS }]);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
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
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      getHighestLayerVersionMock.mockResolvedValue(undefined);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.COMPLETED }]);
      generateTasksParametersMock.mockReturnValue(taskParams);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
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
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      getHighestLayerVersionMock.mockResolvedValue(undefined);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.FAILED }]);
      generateTasksParametersMock.mockReturnValue(taskParams);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action()).resolves.not.toThrow();
    });

    it('fail if layer exists in mapping server for "New" job type', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      getHighestLayerVersionMock.mockResolvedValue(undefined);
      mapExistsMock.mockResolvedValue(true);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('fail if layer exists in catalog for "New" job type', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      getHighestLayerVersionMock.mockResolvedValue(undefined);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(true);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('fail if files are missing for "New" job type', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      getHighestLayerVersionMock.mockResolvedValue(undefined);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(false);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(BadRequestError);
    });
  });

  describe('generateRecordIds', () => {
    it('metadata for "new" ingestion job should includes "id" and "displayPath" while creating job tasks', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      setValue('ingestionTilesSplittingTiles.tasksBatchSize', 2);
      const testData: IngestionParams = {
        fileNames: ['test.tif'],
        metadata: { ...testImageMetadata },
        originDirectory: '/here',
      };

      getHighestLayerVersionMock.mockResolvedValue(undefined);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);
      createLayerJobMock.mockResolvedValue('testJobId');
      createSplitTilesTasksMock.mockResolvedValue(undefined);

      const zoomLevelCalculator = new ZoomLevelCalculator(configMock);
      layersManager = new LayersManager(
        logger,
        zoomLevelCalculator,
        jobManagerClientMock,
        catalogClientMock,
        mapPublisherClientMock,
        fileValidatorMock,
        splitTilesTaskerMock,
        mergeTilesTasker
      );

      await layersManager.createLayer(testData);

      expect(createSplitTilesTasksMock).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(createSplitTilesTasksMock.mock.calls[0][0].metadata).toHaveProperty('id');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(createSplitTilesTasksMock.mock.calls[0][0].metadata).toHaveProperty('displayPath');
    });
  });
});
