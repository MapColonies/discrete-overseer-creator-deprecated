import express from 'express';
import bodyParser from 'body-parser';
import { getErrorHandlerMiddleware } from '@map-colonies/error-express-handler';
import { initAsync as validatorInit } from 'openapi-validator-middleware';
import { container, inject, injectable } from 'tsyringe';
import { RequestLogger } from './common/middlewares/RequestLogger';
import { Services } from './common/constants';
import { IConfig, ILogger } from './common/interfaces';
import { layersRouterFactory } from './layers/routes/layersRouter';
import { progressRouterFactory } from './progress/routes/progressRouter';
import { openapiRouterFactory } from './common/routes/openapi';

@injectable()
export class ServerBuilder {
  private readonly serverInstance = express();

  public constructor(
    @inject(Services.CONFIG) private readonly config: IConfig,
    private readonly requestLogger: RequestLogger,
    @inject(Services.LOGGER) private readonly logger: ILogger
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
    this.serverInstance.use('/progress', progressRouterFactory(container));
    this.serverInstance.use('/', openapiRouterFactory(container));
  }

  private registerPreRoutesMiddleware(): void {
    this.serverInstance.use(bodyParser.json());
    this.serverInstance.use(this.requestLogger.getLoggerMiddleware());
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(getErrorHandlerMiddleware((message) => this.logger.log('error', message)));
  }
}
