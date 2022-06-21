import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { getJobStatusMock, getTaskMock } from '../../mocks/clients/jobManagerClient';
import { publishLayerMock } from '../../mocks/clients/mapPublisherClient';
import { publishToCatalogMock } from '../../mocks/clients/catalogClient';
import { registerTestValues } from '../testContainerConfig';
import { setValue, clear as clearConfig } from '../../mocks/config';
import * as requestSender from './helpers/requestSender';

const jobId = 'c3e8d0c6-6663-49e5-9257-323674161725';
const taskId = '517059cc-f60b-4542-8a41-fdd163358d74';

describe('layers', function () {
  const ingestionNewJobType = 'IngestionNew';
  const tileSplitTask = 'SplitNew';
  const tileMergeTask = 'MergeNew';

  beforeEach(() => {
    console.warn = jest.fn();
    setValue('ingestionNewJobType', ingestionNewJobType);
    setValue('ingestionTaskType', { tileMergeTask, tileSplitTask });
    registerTestValues();
    requestSender.init();
  });
  afterEach(function () {
    clearConfig();
    jest.resetAllMocks();
    container.clearInstances();
  });

  describe('Happy Path', function () {
    it('should return 200 status code when all completed', async function () {
      getJobStatusMock.mockReturnValue({
        isCompleted: true,
        type: ingestionNewJobType,
      });

      getTaskMock.mockReturnValue({
        type: tileSplitTask,
      });

      const response = await requestSender.completeTask(jobId, taskId);
      expect(response).toSatisfyApiSpec();

      expect(response.status).toBe(httpStatusCodes.OK);
    });

    it('should return 200 status code when not all completed', async function () {
      getJobStatusMock.mockReturnValue({
        isCompleted: false,
        type: ingestionNewJobType,
      });

      getTaskMock.mockReturnValue({
        type: tileSplitTask,
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
      getJobStatusMock.mockImplementation(() => {
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
