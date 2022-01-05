import { container } from 'tsyringe';
import { Services } from '../../src/common/constants';
import { JobManagerClient } from '../../src/serviceClients/jobManagerClient';
import { MapPublisherClient } from '../../src/serviceClients/mapPublisherClient';
import { catalogClientMock } from '../mocks/clients/catalogClient';
import { mapPublisherClientMock } from '../mocks/clients/mapPublisherClient';
import { jobManagerClientMock } from '../mocks/clients/jobManagerClient';
import { logger } from '../mocks/logger';
import { CatalogClient } from '../../src/serviceClients/catalogClient';
import { configMock, init as initConfig } from '../mocks/config';

function registerTestValues(): void {
  initConfig();
  container.register(Services.CONFIG, { useValue: configMock });
  container.register(Services.LOGGER, { useValue: logger });
  container.register(JobManagerClient, { useValue: jobManagerClientMock });
  container.register(MapPublisherClient, { useValue: mapPublisherClientMock });
  container.register(CatalogClient, { useValue: catalogClientMock });
}

export { registerTestValues };
