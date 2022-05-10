import { JobManagerClient } from '../../../src/serviceClients/jobManagerClient';

const createLayerJobMock = jest.fn();
const createTasksMock = jest.fn();
const getCompletedZoomLevelsMock = jest.fn();
const updateJobStatusMock = jest.fn();
const findJobsMock = jest.fn();
const checkForUpdateMock = jest.fn();

const jobManagerClientMock = {
  createLayerJob: createLayerJobMock,
  createTasks: createTasksMock,
  getCompletedZoomLevels: getCompletedZoomLevelsMock,
  updateJobStatus: updateJobStatusMock,
  findJobs: findJobsMock,
  checkForUpdate: checkForUpdateMock,
} as unknown as JobManagerClient;

export { createLayerJobMock, createTasksMock, updateJobStatusMock, getCompletedZoomLevelsMock, findJobsMock, checkForUpdateMock, jobManagerClientMock };
