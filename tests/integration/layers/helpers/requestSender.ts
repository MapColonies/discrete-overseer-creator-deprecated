import * as supertest from 'supertest';
import { Application } from 'express';
import { container } from 'tsyringe';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { ServerBuilder } from '../../../../src/serverBuilder';

let app: Application | null = null;

export function init(): void {
  const builder = container.resolve<ServerBuilder>(ServerBuilder);
  app = builder.build();
}

export async function createLayer(body: LayerMetadata): Promise<supertest.Response> {
  return supertest.agent(app).post('/layers').set('Content-Type', 'application/json').send(body);
}
