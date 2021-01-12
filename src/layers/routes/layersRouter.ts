import { Router } from 'express';
import { validate } from 'openapi-validator-middleware';
import { FactoryFunction } from 'tsyringe';
import { LayersController } from '../controllers/layersController';

const layersRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(LayersController);

  router.post('/', validate, controller.createLayer.bind(controller));

  return router;
};

export { layersRouterFactory };
