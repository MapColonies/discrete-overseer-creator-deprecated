import { CatalogClient } from '../../../src/serviceClients/catalogClient';

const catalogExistsMock = jest.fn();
const publishToCatalogMock = jest.fn();
const getMetadataFromCatalogMock = jest.fn();

const catalogClientMock = {
  exists: catalogExistsMock,
  publish: publishToCatalogMock,
  getMetadata: getMetadataFromCatalogMock,
} as unknown as CatalogClient;

export { catalogExistsMock, publishToCatalogMock, getMetadataFromCatalogMock, catalogClientMock };
