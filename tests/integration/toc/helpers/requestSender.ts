import * as supertest from 'supertest';
import { Application } from 'express';
import { container } from 'tsyringe';
import { ServerBuilder } from '../../../../src/serverBuilder';
import { ITocParams, SchemaType } from '../../../../src/toc/interfaces';

let app: Application | null = null;

export function init(): void {
  const builder = container.resolve<ServerBuilder>(ServerBuilder);
  app = builder.build();
}

export async function getMetadata(body: ITocParams, accept?: string): Promise<supertest.Response> {
  const test = supertest.agent(app).post('/toc').set('Content-Type', 'application/json');

  if (accept) {
    test.set('Accept', accept);
  }

  return test.send(body);
}
