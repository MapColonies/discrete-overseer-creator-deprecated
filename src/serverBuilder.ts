import express from 'express';
import bodyParser from 'body-parser';
import { initAsync as validatorInit } from 'openapi-validator-middleware';
import { container, inject, injectable } from 'tsyringe';
import { RequestLogger } from './common/middlewares/RequestLogger';
import { Services } from './common/constants';
import { IConfig, ILogger } from './common/interfaces';
import { layersRouterFactory } from './layers/routes/layersRouter';
import { tasksRouterFactory } from './tasks/routes/tasksRouter';
import { openapiRouterFactory } from './common/routes/openapi';
import { ErrorHandler } from './common/middlewares/ErrorHandler';

@injectable()
export class ServerBuilder {
  private readonly serverInstance = express();

  public constructor(
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly requestLogger: RequestLogger,
    @inject(Services.LOGGER) private readonly logger: ILogger,
    private readonly errorHandler: ErrorHandler
  ) {
    this.serverInstance = express();
  }

  public async build(): Promise<express.Application> {
    await this.initValidation();
    this.registerPreRoutesMiddleware();
    this.buildRoutes();
    this.registerPostRoutesMiddleware();

    return this.serverInstance;
  }

  private async initValidation(): Promise<void> {
    const apiSpecPath = this.config.get<string>('openapiConfig.filePath');
    await validatorInit(apiSpecPath);
  }

  private buildRoutes(): void {
    this.serverInstance.use('/layers', layersRouterFactory(container));
    this.serverInstance.use('/tasks', tasksRouterFactory(container));
    this.serverInstance.use('/', openapiRouterFactory(container));
  }

  private registerPreRoutesMiddleware(): void {
    this.serverInstance.use(bodyParser.json());
    this.serverInstance.use(this.requestLogger.getLoggerMiddleware());
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(this.errorHandler.getErrorHandlerMiddleware());
  }
}
