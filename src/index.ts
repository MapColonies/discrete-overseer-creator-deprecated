// this import must be called before the first import of tsyring
import 'reflect-metadata';
import { Probe } from '@map-colonies/mc-probe';
import { container } from 'tsyringe';
import config from 'config';
import { getApp } from './app';
import { DEFAULT_SERVER_PORT } from './common/constants';

interface IServerConfig {
  port: string;
}

async function main(): Promise<void> {
  const serverConfig = config.get<IServerConfig>('server');
  const port: number = parseInt(serverConfig.port) || DEFAULT_SERVER_PORT;
  const app = getApp();
  const probe = container.resolve<Probe>(Probe);
  await probe.start(app, port);
  probe.readyFlag = true;
}
void main();
