import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';
import { registerTestValues } from '../testContainerConfig';
import { mockCreateLayerTasks } from '../../mocks/clients/storageClient';
import { getMetadataFromCatalogMock } from '../../mocks/clients/catalogClient';
import { NotFoundError } from '../../../src/common/exceptions/http/notFoundError';
import { InternalServerError } from '../../../src/common/exceptions/http/internalServerError';
import * as requestSender from './helpers/requestSender';
import { invalidTestData, validTestData, validTestImageMetadata, validTestJsonResponseData, validTestXmlResponseData } from './helpers/data';

describe('layers', function () {
  beforeAll(function () {
    registerTestValues();
    requestSender.init();
  });

  beforeEach(function () {
    console.warn = jest.fn();
    mockCreateLayerTasks();
  });

  afterEach(function () {
    jest.resetAllMocks();
    container.clearInstances();
  });

  describe('Happy Path', function () {
    it('should return 200 status code when expecting json response', async function () {
      getMetadataFromCatalogMock.mockImplementation(() => {
        return validTestImageMetadata;
      });

      const response = await requestSender.getMetadata(validTestData);
      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toEqual(validTestJsonResponseData);
    });

    it('should return 200 status code when expecting xml response', async function () {
      getMetadataFromCatalogMock.mockImplementation(() => {
        return validTestImageMetadata;
      });

      const response = await requestSender.getMetadata(validTestData, 'application/xml');
      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.text).toEqual(validTestXmlResponseData);
    });
  });

  describe('Bad Path', function () {
    // All requests with status code of 400
    it('should return 400 status code', async function () {
      const response = await requestSender.getMetadata(invalidTestData);
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
    it('should return 404 if requsted layer does not exist', async function () {
      getMetadataFromCatalogMock.mockImplementation(() => {
        throw new NotFoundError('test error');
      });

      const response = await requestSender.getMetadata(validTestData);
      expect(response.status).toBe(httpStatusCodes.NOT_FOUND);
    });

    it('should return 500 status code on db error', async function () {
      getMetadataFromCatalogMock.mockImplementation(() => {
        throw new InternalServerError('test error');
      });
      const response = await requestSender.getMetadata(validTestData);
      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
