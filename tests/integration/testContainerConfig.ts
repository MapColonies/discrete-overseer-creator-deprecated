import { container } from 'tsyringe';
import config from 'config';
import { Services } from '../../src/common/constants';
import { TillerClient } from '../../src/serviceClients/tillerClient';
import { StorageClient } from '../../src/serviceClients/storageClient';
import { MapPublisherClient } from '../../src/serviceClients/publisherClient';
import { resetMocks, storage, tiller, mapPublisher, logger } from './Mocks';

function registerTestValues(): void {
  resetMocks();
  container.register(Services.CONFIG, { useValue: config });
  container.register(Services.LOGGER, { useValue: logger.logger });
  container.register(TillerClient, { useValue: tiller.clientMock });
  container.register(StorageClient, { useValue: storage.clientMock });
  container.register(MapPublisherClient, { useValue: mapPublisher.clientMock });
}

export { registerTestValues };
