import { CatalogClient } from '../../../src/serviceClients/catalogClient';

const catalogExistsMock = jest.fn();
const publishToCatalogMock = jest.fn();
const getMetadataFromCatalogMock = jest.fn();
const getLayerVersionsMock = jest.fn();
const findRecordMock = jest.fn();
const updateMock = jest.fn();

const catalogClientMock = {
  exists: catalogExistsMock,
  publish: publishToCatalogMock,
  getMetadata: getMetadataFromCatalogMock,
  getLayerVersions: getLayerVersionsMock,
  findRecord: findRecordMock,
  update: updateMock
} as unknown as CatalogClient;

export { catalogExistsMock, publishToCatalogMock, getMetadataFromCatalogMock, getLayerVersionsMock, findRecordMock, updateMock, catalogClientMock };
