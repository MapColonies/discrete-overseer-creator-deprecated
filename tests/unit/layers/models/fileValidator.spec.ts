import { container } from 'tsyringe';
import { logger } from '../../../mocks/logger';
import { Services } from '../../../../src/common/constants';
import { FileValidator } from '../../../../src/layers/models/fileValidator';
import { BadRequestError } from '../../../../src/common/exceptions/http/badRequestError';
import { init as initMockConfig, configMock, setValue, clear as clearMockConfig } from '../../../mocks/config';

describe('FileValidator', () => {
  beforeEach(function () {
    container.register(Services.CONFIG, { useValue: configMock });
    container.register(Services.LOGGER, { useValue: logger });
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    clearMockConfig();
    initMockConfig();
  });

  describe('validateGpkgIndex', () => {
    it('should fail if geopackage does not have a tiles index', function () {
      setValue({ layerSourceDir: 'tests/mocks/files' });
      const testData: string[] = ['no-index.gpkg'];
      const fileValidator = new FileValidator(configMock);

      const action = () => fileValidator.validateGpkgIndex(testData);
      expect(action).toThrow(BadRequestError);
    });
  });
});
