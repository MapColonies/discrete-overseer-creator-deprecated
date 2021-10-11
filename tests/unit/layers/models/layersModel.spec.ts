import { IngestionParams, LayerMetadata, ProductType, RecordType, SensorType } from '@map-colonies/mc-model-types';
import { LayersManager } from '../../../../src/layers/models/layersManager';
import { createLayerTasksMock, findJobsMock, dbClientMock } from '../../../mocks/clients/storageClient';
import { catalogExistsMock, catalogClientMock } from '../../../mocks/clients/catalogClient';
import { mapPublisherClientMock, mapExistsMock } from '../../../mocks/clients/mapPublisherClient';
import { init as initMockConfig, configMock, setValue, clear as clearMockConfig } from '../../../mocks/config';
import { logger } from '../../../mocks/logger';
import { fileValidatorValidateExistsMock, fileValidatorMock } from '../../../mocks/fileValidator';
import { ConflictError } from '../../../../src/common/exceptions/http/conflictError';
import { BadRequestError } from '../../../../src/common/exceptions/http/badRequestError';
import { OperationStatus } from '../../../../src/common/enums';
import { ZoomLevelCalculator } from '../../../../src/utils/zoomToResolution';

let layersManager: LayersManager;

const testImageMetadata: LayerMetadata = {
  productId: 'test',
  productVersion: '1.22',
  productName: 'test name',
  description: 'test desc',
  accuracyCE90: 3,
  resolution: 2.68220901489258e-6,
  rms: 0.5,
  scale: '3',
  sensorType: [SensorType.OTHER],
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
  productType: ProductType.ORTHOPHOTO,
  region: '',
  sourceDateEnd: new Date('06/01/2020'),
  sourceDateStart: new Date('05/01/2020'),
  srsId: '4326',
  srsName: 'epsg:4326',
  type: RecordType.RECORD_RASTER,
  layerPolygonParts: undefined,
  includedInBests: undefined,
  maxResolutionMeter: 0.2,
  productBoundingBox: undefined,
  rawProductData: undefined,
};

const testData: IngestionParams = {
  fileNames: [],
  metadata: testImageMetadata,
  originDirectory: '/here',
};

describe('LayersManager', () => {
  beforeEach(function () {
    jest.resetAllMocks();
    clearMockConfig();
    initMockConfig();
  });

  describe('createLayer', () => {
    it('saves metadata before queueing tasks', async function () {
      setValue({ 'tiling.zoomGroups': '1,2-3' });
      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 2,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 3,
        },
      ];

      createLayerTasksMock.mockImplementation(async () => {
        return Promise.resolve(tillingReqs);
      });
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(logger, zoomLevelCalculator, dbClientMock, catalogClientMock, mapPublisherClientMock, fileValidatorMock);

      await layersManager.createLayer(testData);

      expect(createLayerTasksMock).toHaveBeenCalledTimes(1);
      expect(createLayerTasksMock).toHaveBeenCalledWith(testData, [
        { minZoom: 1, maxZoom: 1 },
        { minZoom: 2, maxZoom: 3 },
      ]);
    });

    it('split the tasks based on configuration', async function () {
      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '2',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 5,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 8,
        },
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '3',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 2,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 2,
        },
      ];
      createLayerTasksMock.mockResolvedValue(tillingReqs);

      setValue({ 'tiling.zoomGroups': '1,8-5,2' });

      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(logger, zoomLevelCalculator, dbClientMock, catalogClientMock, mapPublisherClientMock, fileValidatorMock);

      await layersManager.createLayer(testData);

      expect(createLayerTasksMock).toHaveBeenCalledWith(testData, [
        { minZoom: 1, maxZoom: 1 },
        { minZoom: 5, maxZoom: 8 },
        { minZoom: 2, maxZoom: 2 },
      ]);
    });

    it('fail if layer status is pending', async function () {
      setValue({ 'tiling.zoomGroups': '1' });

      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
      ];
      createLayerTasksMock.mockResolvedValue(tillingReqs);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.PENDING }]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(logger, zoomLevelCalculator, dbClientMock, catalogClientMock, mapPublisherClientMock, fileValidatorMock);

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('fail if layer status is inProgress', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
      ];
      createLayerTasksMock.mockResolvedValue(tillingReqs);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.IN_PROGRESS }]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(logger, zoomLevelCalculator, dbClientMock, catalogClientMock, mapPublisherClientMock, fileValidatorMock);

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('pass if layer status is completed', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
      ];
      createLayerTasksMock.mockResolvedValue(tillingReqs);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.COMPLETED }]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(logger, zoomLevelCalculator, dbClientMock, catalogClientMock, mapPublisherClientMock, fileValidatorMock);

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action()).resolves.not.toThrow();
    });

    it('pass if layer status is failed', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
      ];
      createLayerTasksMock.mockResolvedValue(tillingReqs);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([{ status: OperationStatus.FAILED }]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(logger, zoomLevelCalculator, dbClientMock, catalogClientMock, mapPublisherClientMock, fileValidatorMock);

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action()).resolves.not.toThrow();
    });

    it('fail if layer exists in mapping server', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
      ];
      createLayerTasksMock.mockResolvedValue(tillingReqs);
      mapExistsMock.mockResolvedValue(true);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(logger, zoomLevelCalculator, dbClientMock, catalogClientMock, mapPublisherClientMock, fileValidatorMock);

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('fail if layer exists in catalog', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
      ];
      createLayerTasksMock.mockResolvedValue(tillingReqs);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(true);
      fileValidatorValidateExistsMock.mockResolvedValue(true);
      findJobsMock.mockResolvedValue([]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(logger, zoomLevelCalculator, dbClientMock, catalogClientMock, mapPublisherClientMock, fileValidatorMock);

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(ConflictError);
    });

    it('fail if files are missing', async function () {
      setValue({ 'tiling.zoomGroups': '1' });
      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.productId,
          version: testImageMetadata.productVersion,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
      ];
      createLayerTasksMock.mockResolvedValue(tillingReqs);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);
      fileValidatorValidateExistsMock.mockResolvedValue(false);
      findJobsMock.mockResolvedValue([]);

      const zoomLevelCalculator = new ZoomLevelCalculator(logger, configMock);
      layersManager = new LayersManager(logger, zoomLevelCalculator, dbClientMock, catalogClientMock, mapPublisherClientMock, fileValidatorMock);

      const action = async () => {
        await layersManager.createLayer(testData);
      };
      await expect(action).rejects.toThrow(BadRequestError);
    });
  });
});
