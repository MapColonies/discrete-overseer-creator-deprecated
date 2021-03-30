import * as supertest from 'supertest';
import { Application } from 'express';
import { container } from 'tsyringe';
import { ServerBuilder } from '../../../../src/serverBuilder';

let app: Application | null = null;

export function init(): void {
  const builder = container.resolve<ServerBuilder>(ServerBuilder);
  app = builder.build();
}

export async function completeTask(jobId: string, taskId: string): Promise<supertest.Response> {
  return supertest.agent(app).post(`/tasks/${jobId}/${taskId}/completed`).set('Content-Type', 'application/json');
}
