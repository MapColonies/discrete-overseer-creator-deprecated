import { LayerMetadata, SensorType } from '@map-colonies/mc-model-types';
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { RecordType } from '@map-colonies/mc-model-types/Schema/models/pycsw/coreEnums';
import { registerTestValues } from '../testContainerConfig';
import { mockCreateLayerTasks } from '../../mocks/clients/storageClient';
import { getMetadataFromCatalogMock } from '../../mocks/clients/catalogClient';
import * as requestSender from './helpers/requestSender';
import { ITocParams, TocOperation, TocSourceType } from '../../../src/toc/interfaces';
import { NotFoundError } from '../../../src/common/exceptions/http/notFoundError';
import { InternalServerError } from '../../../src/common/exceptions/http/internalServerError';
import xmlbuilder from 'xmlbuilder';

const validTestImageMetadata: LayerMetadata = {
  productId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  productVersion: '1.234.5',
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
  scale: '3.5',
  rms: 2.6,
  updateDate: new Date('11/16/2017'),
  resolution: 0.7,
  sensorType: [SensorType.RGB],
  classification: 'test',
  type: RecordType.RECORD_RASTER,
  productType: 'orthophoto',
  srsId: 'EPSG:4326',
  srsName: 'wgs84',
  producerName: 'testProducer',
  creationDate: new Date('11/16/2017'),
  ingestionDate: new Date('11/16/2017'),
  sourceDateEnd: new Date('11/16/2017'),
  sourceDateStart: new Date('11/16/2017'),
  layerPolygonParts: undefined,
  region: '',
};

const validTestData: ITocParams = {
  operation: TocOperation.ADD,
  sourceType: TocSourceType.BSETMOSAIC,
  productId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  productVersion: '1.234.5',
};

const validTestResponseData = {
  operation: TocOperation.ADD,
  sourceType: TocSourceType.BSETMOSAIC,
  metadata: validTestImageMetadata,
};

const validTestJsonResponseData = JSON.parse(JSON.stringify(validTestResponseData));

const validTestXmlResponseData = xmlbuilder.create(validTestResponseData, { version: '1.0', encoding: 'UTF-8' }).end({ pretty: true });

const invalidTestData = ({
  productId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
} as unknown) as ITocParams;

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
    it('should return 200 status code when expecting json response', async function () {
      getMetadataFromCatalogMock.mockImplementation(() => {
        return validTestImageMetadata;
      });

      const response = await requestSender.getMetadata(validTestData);
      expect(response.status).toBe(httpStatusCodes.OK);
      // Stringify then parse for placing dates in string
      expect(response.body).toEqual(validTestJsonResponseData);
    });

    it('should return 200 status code when expecting xml response', async function () {
      getMetadataFromCatalogMock.mockImplementation(() => {
        return validTestImageMetadata;
      });

      const response = await requestSender.getMetadata(validTestData, 'application/xml');
      expect(response.status).toBe(httpStatusCodes.OK);
      // Stringify then parse for placing dates in string
      expect(response.text).toEqual(validTestXmlResponseData);
    });
  });

  describe('Bad Path', function () {
    // All requests with status code of 400
    it('should return 400 status code', async function () {
      const response = await requestSender.getMetadata(invalidTestData);
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
    it('should return 404 if requsted layer does not exist', async function () {
      getMetadataFromCatalogMock.mockImplementation(() => {
        throw new NotFoundError('test error');
      });

      const response = await requestSender.getMetadata(validTestData);
      expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
    });

    it('should return 500 status code on db error', async function () {
      getMetadataFromCatalogMock.mockImplementation(() => {
        throw new InternalServerError('test error');
      });
      const response = await requestSender.getMetadata(validTestData);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
