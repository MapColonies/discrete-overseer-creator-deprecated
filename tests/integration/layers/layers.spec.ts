import { LayerMetadata, SensorType } from '@map-colonies/mc-model-types';
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { registerTestValues } from '../testContainerConfig';
import { createLayerTasksMock, mockCreateLayerTasks, getLayerStatusMock } from '../../mocks/clients/storageClient';
import { addTilingRequestMock } from '../../mocks/clients/tillerClient';
import { TaskState } from '../../../src/serviceClients/storageClient';
import * as requestSender from './helpers/requestSender';

const validTestImageMetadata: LayerMetadata = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  version: '1.234.5',
  source: '3fa85f64-5717-4562-b3fc-2c963f66afa6-1.234.5',
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
    it('should return 409 if rested layer is already being generated', async function () {
      getLayerStatusMock.mockResolvedValue(TaskState.IN_PROGRESS);

      const response = await requestSender.createLayer(validTestImageMetadata);
      expect(response.status).toBe(httpStatusCodes.CONFLICT);
    });
    it('should return 500 status code on db error', async function () {
      createLayerTasksMock.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.createLayer(validTestImageMetadata);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should return 500 status code on kafka error', async function () {
      addTilingRequestMock.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.createLayer(validTestImageMetadata);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
