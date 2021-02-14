import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { ITaskId } from '../../../src/tasks/interfaces';
import { storage, mapPublisher } from '../Mocks';

import { registerTestValues } from '../testContainerConfig';
import * as requestSender from './helpers/requestSender';

const testData: ITaskId = {
  id: 'testId',
  version: '1',
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
    it('should return 200 status code when all completed', async function () {
      storage.getCompletedZoomLevelsMock.mockReturnValue({
        allCompleted: true,
      });
      const response = await requestSender.completeTask(testData.id, testData.version);
      expect(response.status).toBe(httpStatusCodes.OK);
    });

    it('should return 200 status code when not all completed', async function () {
      storage.getCompletedZoomLevelsMock.mockReturnValue({
        allCompleted: false,
      });
      const response = await requestSender.completeTask(testData.id, testData.version);
      expect(response.status).toBe(httpStatusCodes.OK);
    });
  });

  describe('Bad Path', function () {
    // All requests with status code of 400
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
    it('should return 500 if failed to get completed zoom levels', async function () {
      storage.getCompletedZoomLevelsMock.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.completeTask(testData.id, testData.version);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should return 500 if failed to publish layer', async function () {
      mapPublisher.publishLayerMock.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.completeTask(testData.id, testData.version);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });

    //TODO: readd test after catalog integration
    it.skip('should return 500 if failed to publish to catalog', async function () {
      // storage.publishToCatalogMock.mockImplementation(() => {
      //   throw new Error('test error');
      // });
      const response = await requestSender.completeTask(testData.id, testData.version);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
