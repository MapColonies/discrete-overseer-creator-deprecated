import { Router } from 'express';
import { validate } from 'openapi-validator-middleware';
import { FactoryFunction } from 'tsyringe';
import { TasksController } from '../controllers/tasksController';

const tasksRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(TasksController);

  router.post('/:id/:version/completed', validate, controller.completeWorkerTask.bind(controller));

  return router;
};

export { tasksRouterFactory };
