import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { TasksController } from '../controllers/tasksController';

const tasksRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(TasksController);

  router.post('/:id/:version/completed', controller.completeWorkerTask.bind(controller));

  return router;
};

export { tasksRouterFactory };
