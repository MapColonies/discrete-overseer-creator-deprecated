import { CatalogClient } from '../../../src/serviceClients/catalogClient';

const catalogExistsMock = jest.fn();
const publishToCatalogMock = jest.fn();

const catalogClientMock = ({
  exists: catalogExistsMock,
  publish: publishToCatalogMock,
} as unknown) as CatalogClient;

export { catalogExistsMock, publishToCatalogMock, catalogClientMock };
