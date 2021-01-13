import { readFileSync } from 'fs';
import { container } from 'tsyringe';
import config from 'config';
import { MCLogger, IServiceConfig } from '@map-colonies/mc-logger';
import { Services } from '../../src/common/constants';
import { TillerClient } from '../../src/serviceClients/tillerClient';
import { StorageClient } from '../../src/serviceClients/storageClient';
import { storage, tiller } from './Mocks';

function registerTestValues(): void {
  const packageContent = readFileSync('./package.json', 'utf8');
  const service = JSON.parse(packageContent) as IServiceConfig;
  const logger = new MCLogger({ log2console: true, level: 'error' }, service);

  container.register(Services.CONFIG, { useValue: config });
  container.register(Services.LOGGER, { useValue: logger });
  container.register(TillerClient, { useValue: tiller.clientMock });
  container.register(StorageClient, { useValue: storage.clientMock });
}

export { registerTestValues };
