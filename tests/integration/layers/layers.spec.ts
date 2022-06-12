import { LayerMetadata, ProductType } from '@map-colonies/mc-model-types';
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { RecordType } from '@map-colonies/mc-model-types/Schema/models/pycsw/coreEnums';
import { registerTestValues } from '../testContainerConfig';
import { findJobsMock, createLayerJobMock, createTasksMock } from '../../mocks/clients/jobManagerClient';
import { mapExistsMock } from '../../mocks/clients/mapPublisherClient';
import { catalogExistsMock, getLayerVersionsMock } from '../../mocks/clients/catalogClient';
import { setValue, clear as clearConfig } from '../../mocks/config';
import { OperationStatus } from '../../../src/common/enums';
import * as requestSender from './helpers/requestSender';

const validTestImageMetadata: LayerMetadata = {
  productId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  productVersion: '1.23',
  productName: 'test layer',
  description: 'test layer desc',
  minHorizontalAccuracyCE90: 0.7,
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
  scale: 100,
  rms: 2.6,
  updateDate: new Date('11/16/2017'),
  maxResolutionDeg: 0.007,
  sensors: ['RGB'],
  classification: 'test',
  type: RecordType.RECORD_RASTER,
  productType: ProductType.ORTHOPHOTO_HISTORY,
  productSubType: undefined,
  srsId: '4326',
  srsName: 'wgs84',
  producerName: 'testProducer',
  creationDate: new Date('11/16/2017'),
  ingestionDate: new Date('11/16/2017'),
  sourceDateEnd: new Date('11/16/2017'),
  sourceDateStart: new Date('11/16/2017'),
  layerPolygonParts: undefined,
  region: [],
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
const invalidTestImageMetadata = {
  source: 'testId',
  invalidFiled: 'invalid',
} as unknown as LayerMetadata;
const invalidTestData = {
  fileNames: [],
  metadata: invalidTestImageMetadata,
  originDirectory: '/here',
};

describe('layers', function () {
  beforeEach(function () {
    console.warn = jest.fn();
    setValue('tiling.zoomGroups', '0,1,2,3,4,5,6,7,8,9,10');
    setValue('ingestionTilesSplittingTiles.tasksBatchSize', 2);
    setValue('layerSourceDir', 'tests/mocks');
    registerTestValues();
    requestSender.init();
    createLayerJobMock.mockResolvedValue('jobId');
  });
  afterEach(function () {
    clearConfig();
    jest.resetAllMocks();
    container.clearInstances();
  });

  describe('Happy Path', function () {
    it('should return 200 status code', async function () {
      findJobsMock.mockResolvedValue([]);
      const response = await requestSender.createLayer(validTestData);
      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(httpStatusCodes.OK);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(1);
      expect(findJobsMock).toHaveBeenCalledTimes(1);
      expect(mapExistsMock).toHaveBeenCalledTimes(1);
      expect(catalogExistsMock).toHaveBeenCalledTimes(1);
      expect(createLayerJobMock).toHaveBeenCalledTimes(1);
      expect(createTasksMock).toHaveBeenCalledTimes(3);
    });
  });

  it('should return 200 status code for indexed gpkg', async function () {
    getLayerVersionsMock.mockResolvedValue([]);
    findJobsMock.mockResolvedValue([]);
    mapExistsMock.mockResolvedValue(false);
    catalogExistsMock.mockResolvedValue(false);

    const testData = {
      fileNames: ['indexed.gpkg'],
      metadata: validTestImageMetadata,
      originDirectory: 'files',
    };

    const response = await requestSender.createLayer(testData);

    expect(response).toSatisfyApiSpec();
    expect(response.status).toBe(httpStatusCodes.OK);
    expect(findJobsMock).toHaveBeenCalledTimes(1);
    expect(getLayerVersionsMock).toHaveBeenCalledTimes(1);
    expect(mapExistsMock).toHaveBeenCalledTimes(1);
    expect(catalogExistsMock).toHaveBeenCalledTimes(1);
    expect(createLayerJobMock).toHaveBeenCalledTimes(1);
    expect(createTasksMock).toHaveBeenCalledTimes(0);
  });

  describe('Bad Path', function () {
    // All requests with status code of 400
    it('should return 400 status code for invalid Test Data', async function () {
      const response = await requestSender.createLayer(invalidTestData);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(0);
      expect(findJobsMock).toHaveBeenCalledTimes(0);
      expect(mapExistsMock).toHaveBeenCalledTimes(0);
      expect(catalogExistsMock).toHaveBeenCalledTimes(0);
      expect(createLayerJobMock).toHaveBeenCalledTimes(0);
      expect(createTasksMock).toHaveBeenCalledTimes(0);
    });

    it('should return 400 status code for id field', async function () {
      let invalidTestMetaDataHasId = { ...validTestData.metadata } as Record<string, unknown>;
      invalidTestMetaDataHasId = { ...invalidTestMetaDataHasId, id: 'test id' };
      const invalidTestData = { ...validTestData, metadata: invalidTestMetaDataHasId };
      const response = await requestSender.createLayer(invalidTestData);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(0);
      expect(findJobsMock).toHaveBeenCalledTimes(0);
      expect(mapExistsMock).toHaveBeenCalledTimes(0);
      expect(catalogExistsMock).toHaveBeenCalledTimes(0);
      expect(createLayerJobMock).toHaveBeenCalledTimes(0);
      expect(createTasksMock).toHaveBeenCalledTimes(0);
    });

    it('should return 400 status code for update layer operation with lower version then catalog exists', async function () {
      let invalidTestMetaDataHasLowerVersion = { ...validTestData.metadata } as Record<string, unknown>;
      invalidTestMetaDataHasLowerVersion = { ...invalidTestMetaDataHasLowerVersion, productVersion: '1.0' };
      const invalidTestData = { ...validTestData, metadata: invalidTestMetaDataHasLowerVersion };
      getLayerVersionsMock.mockResolvedValue([2.0]);
      findJobsMock.mockResolvedValue([]);
      const response = await requestSender.createLayer(invalidTestData);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(findJobsMock).toHaveBeenCalledTimes(1);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(1);
      expect(mapExistsMock).toHaveBeenCalledTimes(0);
      expect(catalogExistsMock).toHaveBeenCalledTimes(0);
      expect(createLayerJobMock).toHaveBeenCalledTimes(0);
      expect(createTasksMock).toHaveBeenCalledTimes(0);
    });

    it('should return 400 status code for unindexed gpkg', async function () {
      getLayerVersionsMock.mockResolvedValue([]);
      findJobsMock.mockResolvedValue([]);
      mapExistsMock.mockResolvedValue(false);
      catalogExistsMock.mockResolvedValue(false);

      const testData = {
        fileNames: ['unindexed.gpkg'],
        metadata: validTestImageMetadata,
        originDirectory: 'files',
      };

      const response = await requestSender.createLayer(testData);

      expect(response).toSatisfyApiSpec();
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(findJobsMock).toHaveBeenCalledTimes(1);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(1);
      expect(mapExistsMock).toHaveBeenCalledTimes(0);
      expect(catalogExistsMock).toHaveBeenCalledTimes(0);
      expect(createLayerJobMock).toHaveBeenCalledTimes(0);
      expect(createTasksMock).toHaveBeenCalledTimes(0);
    });

    it('should return 400 status code for invalid product type', async function () {
      const invalidTestMetaDataProductType = { ...validTestData.metadata };
      invalidTestMetaDataProductType.productType = ProductType.PHOTO_REALISTIC_3D;
      const invalidTestDataForProductType = { ...validTestData, metadata: invalidTestMetaDataProductType };
      const response = await requestSender.createLayer(invalidTestDataForProductType);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(0);
      expect(findJobsMock).toHaveBeenCalledTimes(0);
      expect(mapExistsMock).toHaveBeenCalledTimes(0);
      expect(catalogExistsMock).toHaveBeenCalledTimes(0);
      expect(createLayerJobMock).toHaveBeenCalledTimes(0);
      expect(createTasksMock).toHaveBeenCalledTimes(0);
    });
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
    it('should return 409 if rested layer is already being generated', async function () {
      const jobs = [{ status: OperationStatus.FAILED }, { status: OperationStatus.IN_PROGRESS }];
      findJobsMock.mockResolvedValue(jobs);

      const response = await requestSender.createLayer(validTestData);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.CONFLICT);
      expect(findJobsMock).toHaveBeenCalledTimes(1);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(0);
      expect(mapExistsMock).toHaveBeenCalledTimes(0);
      expect(catalogExistsMock).toHaveBeenCalledTimes(0);
      expect(createLayerJobMock).toHaveBeenCalledTimes(0);
      expect(createTasksMock).toHaveBeenCalledTimes(0);
    });

    it('should return 500 status code on db error', async function () {
      findJobsMock.mockRejectedValue(new Error('db fail test'));

      const response = await requestSender.createLayer(validTestData);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
      expect(findJobsMock).toHaveBeenCalledTimes(1);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(0);
      expect(mapExistsMock).toHaveBeenCalledTimes(0);
      expect(catalogExistsMock).toHaveBeenCalledTimes(0);
      expect(createLayerJobMock).toHaveBeenCalledTimes(0);
      expect(createTasksMock).toHaveBeenCalledTimes(0);
    });

    it('should return 409 status code when layer exists in map server', async function () {
      findJobsMock.mockResolvedValue([]);
      mapExistsMock.mockResolvedValue(true);
      const response = await requestSender.createLayer(validTestData);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.CONFLICT);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(1);
      expect(findJobsMock).toHaveBeenCalledTimes(1);
      expect(mapExistsMock).toHaveBeenCalledTimes(1);
      expect(catalogExistsMock).toHaveBeenCalledTimes(1);
      expect(createLayerJobMock).toHaveBeenCalledTimes(0);
      expect(createTasksMock).toHaveBeenCalledTimes(0);
    });

    it('should return 409 status code when layer exists in catalog', async function () {
      findJobsMock.mockResolvedValue([]);
      catalogExistsMock.mockResolvedValue(true);
      const response = await requestSender.createLayer(validTestData);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.CONFLICT);
      expect(getLayerVersionsMock).toHaveBeenCalledTimes(1);
      expect(findJobsMock).toHaveBeenCalledTimes(1);
      expect(mapExistsMock).toHaveBeenCalledTimes(1);
      expect(catalogExistsMock).toHaveBeenCalledTimes(1);
      expect(createLayerJobMock).toHaveBeenCalledTimes(0);
      expect(createTasksMock).toHaveBeenCalledTimes(0);
    });
  });
});
