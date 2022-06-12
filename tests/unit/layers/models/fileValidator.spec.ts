import { container } from 'tsyringe';
import { logger } from '../../../mocks/logger';
import { Services } from '../../../../src/common/constants';
import { FileValidator } from '../../../../src/layers/models/fileValidator';
import { BadRequestError } from '../../../../src/common/exceptions/http/badRequestError';
import { SQLiteClient } from '../../../../src/serviceClients/sqliteClient';
import { init as initMockConfig, configMock, setValue, clear as clearMockConfig } from '../../../mocks/config';

jest.mock('better-sqlite3');

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
      const getGpkgIndexFn = jest.spyOn(SQLiteClient.prototype as unknown as { getGpkgIndex: () => unknown }, 'getGpkgIndex');
      getGpkgIndexFn.mockReturnValue(undefined);
      setValue({ layerSourceDir: 'tests/mocks' });
      const testData: string[] = ['unindexed.gpkg'];
      const fileValidator = new FileValidator(configMock);

      const action = () => fileValidator.validateGpkgIndex(testData, 'files');
      expect(action).toThrow(BadRequestError);
      expect(getGpkgIndexFn).toHaveBeenCalledTimes(1);
    });
  });

  it('should not throw an error if geopackage have a tile index', function () {
    const getGpkgIndexFn = jest.spyOn(SQLiteClient.prototype as unknown as { getGpkgIndex: () => unknown }, 'getGpkgIndex');
    getGpkgIndexFn.mockReturnValue({});
    setValue({ layerSourceDir: 'tests/mocks' });
    const testData: string[] = ['indexed.gpkg'];
    const fileValidator = new FileValidator(configMock);

    const action = () => fileValidator.validateGpkgIndex(testData, 'files');
    expect(action).not.toThrow();
    expect(getGpkgIndexFn).toHaveBeenCalledTimes(1);
  });
});
