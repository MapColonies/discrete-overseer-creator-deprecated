import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { getJob } from '../../mocks/clients/jobManagerClient';
import { publishLayerMock } from '../../mocks/clients/mapPublisherClient';
import { publishToCatalogMock } from '../../mocks/clients/catalogClient';
import { registerTestValues } from '../testContainerConfig';
import * as requestSender from './helpers/requestSender';

const jobId = 'c3e8d0c6-6663-49e5-9257-323674161725';
const taskId = '517059cc-f60b-4542-8a41-fdd163358d74';

describe('layers', function () {
  beforeAll(function () {
    registerTestValues();
    requestSender.init();
  });
  beforeEach(() => {
    console.warn = jest.fn();
  });
  afterEach(function () {
    jest.resetAllMocks();
    container.clearInstances();
  });

  describe('Happy Path', function () {
    it('should return 200 status code when all completed', async function () {
      getJob.mockReturnValue({
        allCompleted: true,
      });
      const response = await requestSender.completeTask(jobId, taskId);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.OK);
    });

    it('should return 200 status code when not all completed', async function () {
      getJob.mockReturnValue({
        allCompleted: false,
      });
      const response = await requestSender.completeTask(jobId, taskId);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.OK);
    });
  });

  describe('Bad Path', function () {
    // All requests with status code of 400
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
    it('should return 500 if failed to get completed zoom levels', async function () {
      getJob.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.completeTask(jobId, taskId);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should return 500 if failed to publish layer', async function () {
      publishLayerMock.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.completeTask(jobId, taskId);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should return 500 if failed to publish to catalog', async function () {
      publishToCatalogMock.mockImplementation(() => {
        throw new Error('test error');
      });
      const response = await requestSender.completeTask(jobId, taskId);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
