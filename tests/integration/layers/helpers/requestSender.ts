import * as supertest from 'supertest';
import { Application } from 'express';
import { container } from 'tsyringe';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { ServerBuilder } from '../../../../src/serverBuilder';

let app: Application | null = null;

const parseDate = (date: Date): string => {
  const padLength = 2;
  const day = String(date.getDate()).padStart(padLength, '0');
  const month = String(date.getMonth()).padStart(padLength, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

export function init(): void {
  const builder = container.resolve<ServerBuilder>(ServerBuilder);
  app = builder.build();
}

export async function createLayer(body: LayerMetadata): Promise<supertest.Response> {
  const req = { ...body };
  if (req.updateDate) {
    const strDate = parseDate(req.updateDate);
    ((req as unknown) as { updateDate: string }).updateDate = strDate;
  }
  return supertest.agent(app).post('/layers').set('Content-Type', 'application/json').send(req);
}
