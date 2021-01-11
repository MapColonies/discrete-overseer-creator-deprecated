import { LayersManager } from '../../../../src/layers/models/layersManager';

let layersManager: LayersManager;

describe('LayersManager', () => {
  beforeEach(function () {
    layersManager = new LayersManager({ log: jest.fn() });
  });
  describe('createLayer', () => {
    it('throws error', function () {
      // action
      const action = () => {
        layersManager.createLayer({});
      };
      // expectation
      expect(action).toThrow();
    });
  });
});
