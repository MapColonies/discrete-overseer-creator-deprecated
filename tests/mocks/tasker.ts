import { Tasker } from '../../src/layers/models/tasker';

const generateTasksParametersMock = jest.fn();
const createIngestionTaskMock = jest.fn();

const taskerMock = {
  generateTasksParameters: generateTasksParametersMock,
  createIngestionTask: createIngestionTaskMock,
} as unknown as Tasker;

export { taskerMock, generateTasksParametersMock, createIngestionTaskMock };
