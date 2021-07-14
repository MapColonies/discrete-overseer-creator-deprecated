import { container } from 'tsyringe';
import config from 'config';
import { Services } from '../../src/common/constants';
import { StorageClient } from '../../src/serviceClients/storageClient';
import { MapPublisherClient } from '../../src/serviceClients/mapPublisherClient';
import { catalogClientMock } from '../mocks/clients/catalogClient';
import { mapPublisherClientMock } from '../mocks/clients/mapPublisherClient';
import { dbClientMock } from '../mocks/clients/storageClient';
import { logger } from '../mocks/logger';
import { CatalogClient } from '../../src/serviceClients/catalogClient';

function registerTestValues(): void {
  container.register(Services.CONFIG, { useValue: config });
  container.register(Services.LOGGER, { useValue: logger });
  container.register(StorageClient, { useValue: dbClientMock });
  container.register(MapPublisherClient, { useValue: mapPublisherClientMock });
  container.register(CatalogClient, { useValue: catalogClientMock });
}

export { registerTestValues };
