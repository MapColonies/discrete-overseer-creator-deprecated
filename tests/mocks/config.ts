import { IConfig } from '../../src/common/interfaces';

const getMock = jest.fn();
const hasMock = jest.fn();

const configMock = ({
  get: getMock,
  has: hasMock,
} as unknown) as IConfig;

export { getMock, hasMock, configMock };
