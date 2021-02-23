import { ILogger } from '../../src/common/interfaces';

const logMock = jest.fn();
const logger = {
  log: logMock,
} as ILogger;

export { logMock, logger };
