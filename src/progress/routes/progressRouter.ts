import { Router } from 'express';
import { validate } from 'openapi-validator-middleware';
import { FactoryFunction } from 'tsyringe';
import { ProgressController } from '../controllers/progressController';

const progressRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(ProgressController);

  router.post('/completetask/:id/:version', validate, controller.completeWorkerTask.bind(controller));

  return router;
};

export { progressRouterFactory };
