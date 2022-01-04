import { Tasker } from '../../src/layers/models/tasker';

const generateTasksParametersMock = jest.fn();

const taskerMock = {
  generateTasksParameters: generateTasksParametersMock,
} as unknown as Tasker;

export { taskerMock, generateTasksParametersMock };
