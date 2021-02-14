import { LayerMetadata, SensorType } from '@map-colonies/mc-model-types';
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { storage, tiller } from '../Mocks';
import { registerTestValues } from '../testContainerConfig';
import * as requestSender from './helpers/requestSender';

const validTestImageMetadata: LayerMetadata = {
  source: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  version: '1.234.5',
  sourceName: 'test layer',
  dsc: 'test layer desc',
  ep90: 0.7,
  geometry: {
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
  sensorType: SensorType.RGB,
  fileUris: [],
};
const invalidTestImageMetadata = {
  source: 'testId',
  invalidFiled: 'invalid',
};

describe('layers', function () {
  beforeAll(async function () {
    registerTestValues();
    await requestSender.init();
  });
  afterEach(function () {
    container.clearInstances();
  });

  describe('Happy Path', function () {
    it('should return 200 status code', async function () {
      const response = await requestSender.createLayer(validTestImageMetadata);
      expect(response.status).toBe(httpStatusCodes.OK);
    });
  });

  describe('Bad Path', function () {
    // All requests with status code of 400
    it('should return 400 status code', async function () {
      const response = await requestSender.createLayer((invalidTestImageMetadata as unknown) as LayerMetadata);
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
    it('should return 500 status code on db error', async function () {
      storage.createLayerTasksMock.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.createLayer(validTestImageMetadata);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });

    //TODO: change when errors are handled
    it('should return 500 status code on db error when doing status update', async function () {
      storage.updateTaskStatusMock.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.createLayer(validTestImageMetadata);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should return 500 status code on kafka error', async function () {
      tiller.addTilingRequestMock.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.createLayer(validTestImageMetadata);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
