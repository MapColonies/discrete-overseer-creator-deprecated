import { LayersManager } from '../../src/layers/models/layersManager';

const validateNotRunningMock = jest.fn();

const layersManagerMock = {
  validateNotRunning: validateNotRunningMock,
} as unknown as LayersManager;

export { validateNotRunningMock, layersManagerMock };
