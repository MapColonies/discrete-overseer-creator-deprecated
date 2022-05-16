import { LayersManager } from '../../src/layers/models/layersManager';

const checkForUpdateMock = jest.fn();

const layersManagerMock = {
  checkForUpdate: checkForUpdateMock,
} as unknown as LayersManager;

export { checkForUpdateMock, layersManagerMock };
