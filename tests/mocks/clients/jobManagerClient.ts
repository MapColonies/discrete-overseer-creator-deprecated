import { JobManagerClient } from '../../../src/serviceClients/jobManagerClient';

const createLayerJobMock = jest.fn();
const createTasksMock = jest.fn();
const getJob = jest.fn();
const getTask = jest.fn();
const updateJobStatusMock = jest.fn();
const findJobsMock = jest.fn();
const abortJobMock = jest.fn();

const jobManagerClientMock = {
  createLayerJob: createLayerJobMock,
  createTasks: createTasksMock,
  getJob: getJob,
  getTask: getTask,
  updateJobStatus: updateJobStatusMock,
  findJobs: findJobsMock,
  abortJob: abortJobMock
} as unknown as JobManagerClient;

export { createLayerJobMock, createTasksMock, updateJobStatusMock, getJob, getTask, findJobsMock, abortJobMock, jobManagerClientMock };
