import { CatalogClient } from '../../../src/serviceClients/catalogClient';

const catalogExistsMock = jest.fn();

const catalogClientMock = ({
  exists: catalogExistsMock,
} as unknown) as CatalogClient;

export { catalogExistsMock, catalogClientMock };
