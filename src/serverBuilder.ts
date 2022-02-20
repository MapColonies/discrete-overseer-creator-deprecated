import express from 'express';
import bodyParser from 'body-parser';
import { container, inject, injectable } from 'tsyringe';
import { middleware as OpenApiMiddleware } from 'express-openapi-validator';
import { getErrorHandlerMiddleware } from '@map-colonies/error-express-handler';
import getStorageExplorerMiddleware, { IFile } from '@map-colonies/storage-explorer-middleware';
import './tasks/models/linksBuilder';
import { RequestLogger } from './common/middlewares/RequestLogger';
import { Services } from './common/constants';
import { IConfig, ILogger } from './common/interfaces';
import { layersRouterFactory } from './layers/routes/layersRouter';
import { tasksRouterFactory } from './tasks/routes/tasksRouter';
import { openapiRouterFactory } from './common/routes/openapi';
import { tocRouterFactory } from './toc/routes/tocRouter';

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

  public build(): express.Application {
    this.registerPreRoutesMiddleware();
    this.buildRoutes();
    this.registerPostRoutesMiddleware();

    return this.serverInstance;
  }

  private buildRoutes(): void {
    this.serverInstance.use('/layers', layersRouterFactory(container));
    this.serverInstance.use('/tasks', tasksRouterFactory(container));
    this.serverInstance.use('/toc', tocRouterFactory(container));
    this.serverInstance.use('/', openapiRouterFactory(container));
  }

  private registerPreRoutesMiddleware(): void {
    this.serverInstance.use(bodyParser.json(this.config.get<bodyParser.Options>('server.request.payload')));
    this.serverInstance.use(this.requestLogger.getLoggerMiddleware());
    const ignorePathRegex = new RegExp(`^(${this.config.get<string>('openapiConfig.basePath')})|(explorer)/.*`, 'i');
    const apiSpecPath = this.config.get<string>('openapiConfig.filePath');
    this.serverInstance.use(OpenApiMiddleware({ apiSpec: apiSpecPath, validateRequests: true, ignorePaths: ignorePathRegex }));
    const physicalDirPath = this.config.get<string>('LayerSourceDir');
    const displayNameDir = this.config.get<string>('displayNameDir');
    const mountDirs = [
      {
        physical: physicalDirPath,
        displayName: displayNameDir,
      },
    ];
    this.serverInstance.use(getStorageExplorerMiddleware(mountDirs, this.logger as unknown as Record<string, unknown>));
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(getErrorHandlerMiddleware((message) => this.logger.log('error', message)));
  }
}
