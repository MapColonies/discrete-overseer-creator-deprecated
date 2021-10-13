import { LayerMetadata, ProductType, SensorType } from '@map-colonies/mc-model-types';
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { RecordType } from '@map-colonies/mc-model-types/Schema/models/pycsw/coreEnums';
import { registerTestValues } from '../testContainerConfig';
import { createLayerTasksMock, mockCreateLayerTasks, findJobsMock } from '../../mocks/clients/storageClient';
import { mapExistsMock } from '../../mocks/clients/mapPublisherClient';
import { catalogExistsMock } from '../../mocks/clients/catalogClient';
import { OperationStatus } from '../../../src/common/enums';
import * as requestSender from './helpers/requestSender';

const validTestImageMetadata: LayerMetadata = {
  productId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  productVersion: '1.234',
  productName: 'test layer',
  description: 'test layer desc',
  accuracyCE90: 0.7,
  footprint: {
    type: 'Polygon',
    coordinates: [
      [
        [100, 0],
        [101, 0],
        [101, 1],
        [100, 1],
        [100, 0],
      ],
    ],
  },
  scale: '100',
  rms: 2.6,
  updateDate: new Date('11/16/2017'),
  resolution: 0.007,
  sensorType: [SensorType.RGB],
  classification: 'test',
  type: RecordType.RECORD_RASTER,
  productType: ProductType.ORTHOPHOTO,
  productSubType: undefined,
  srsId: '4326',
  srsName: 'wgs84',
  producerName: 'testProducer',
  creationDate: new Date('11/16/2017'),
  ingestionDate: new Date('11/16/2017'),
  sourceDateEnd: new Date('11/16/2017'),
  sourceDateStart: new Date('11/16/2017'),
  layerPolygonParts: undefined,
  region: '',
  includedInBests: undefined,
  maxResolutionMeter: 0.2,
  productBoundingBox: undefined,
  rawProductData: undefined,
};
const validTestData = {
  fileNames: [],
  metadata: validTestImageMetadata,
  originDirectory: '/here',
};
const invalidTestImageMetadata = ({
  source: 'testId',
  invalidFiled: 'invalid',
} as unknown) as LayerMetadata;
const invalidTestData = {
  fileNames: [],
  metadata: invalidTestImageMetadata,
  originDirectory: '/here',
};

describe('layers', function () {
  beforeAll(function () {
    registerTestValues();
    requestSender.init();
  });
  beforeEach(function () {
    console.warn = jest.fn();
    mockCreateLayerTasks();
  });
  afterEach(function () {
    jest.resetAllMocks();
    container.clearInstances();
  });

  describe('Happy Path', function () {
    it('should return 200 status code', async function () {
      findJobsMock.mockResolvedValue([]);

      const response = await requestSender.createLayer(validTestData);

      expect(response.status).toBe(httpStatusCodes.OK);
    });
  });

  describe('Bad Path', function () {
    // All requests with status code of 400
    it('should return 400 status code', async function () {
      const response = await requestSender.createLayer(invalidTestData);
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
    it('should return 409 if rested layer is already being generated', async function () {
      const jobs = [{ status: OperationStatus.FAILED }, { status: OperationStatus.IN_PROGRESS }];
      findJobsMock.mockResolvedValue(jobs);

      const response = await requestSender.createLayer(validTestData);
      expect(response.status).toBe(httpStatusCodes.CONFLICT);
    });

    it('should return 500 status code on db error', async function () {
      createLayerTasksMock.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.createLayer(validTestData);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should return 409 status code when layer exists in map server', async function () {
      findJobsMock.mockResolvedValue([]);
      mapExistsMock.mockResolvedValue(true);
      const response = await requestSender.createLayer(validTestData);
      expect(response.status).toBe(httpStatusCodes.CONFLICT);
    });

    it('should return 409 status code when layer exists in catalog', async function () {
      findJobsMock.mockResolvedValue([]);
      catalogExistsMock.mockResolvedValue(true);
      const response = await requestSender.createLayer(validTestData);
      expect(response.status).toBe(httpStatusCodes.CONFLICT);
    });
  });
});
