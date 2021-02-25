import { readFileSync } from 'fs';
import * as openapiUi from 'swagger-ui-express';
import { Request, Response, RequestHandler, NextFunction } from 'express';
import { safeLoad } from 'js-yaml';
import { injectable, inject } from 'tsyringe';
import { IConfig } from 'config';
import { resolveRefs } from 'json-refs';
import httpStatus from 'http-status-codes';
import { Services } from '../constants';
import { ILogger, OpenApiConfig } from '../interfaces';
@injectable()
export class OpenapiController {
  public uiMiddleware: RequestHandler[];

  private uiHandler?: RequestHandler;
  private openapiDoc?: openapiUi.JsonObject;

  public constructor(@inject(Services.LOGGER) private readonly logger: ILogger, @inject(Services.CONFIG) private readonly config: IConfig) {
    const openapiConfig = config.get<OpenApiConfig>('openapiConfig');
    this.uiMiddleware = openapiUi.serve;
    this.init(openapiConfig).catch((err) => {
      throw err;
    });
  }

  public serveUi(req: Request, res: Response, next: NextFunction): void {
    if (this.uiHandler) {
      this.uiHandler(req, res, next);
    } else {
      res.sendStatus(httpStatus.SERVICE_UNAVAILABLE);
    }
  }

  public serveJson(req: Request, res: Response): void {
    res.json(this.openapiDoc);
  }

  private async init(openapiConfig: OpenApiConfig): Promise<void> {
    const openapiDefinition = readFileSync(openapiConfig.filePath, 'utf8');
    const parsedDefinition = safeLoad(openapiDefinition) as openapiUi.JsonObject;
    this.openapiDoc = (await this.multiFileSwagger(parsedDefinition, openapiConfig.filePath).catch((err) => {
      throw err;
    })) as openapiUi.JsonObject;
    this.uiHandler = openapiUi.setup(this.openapiDoc, {
      swaggerOptions: { basePath: '.' },
    });
  }

  private async multiFileSwagger(root: Record<string, unknown>, fileLocation: string): Promise<void | Record<string, unknown>> {
    const options = {
      filter: ['relative', 'remote'],
      location: fileLocation,
      loaderOptions: {
        processContent: function (res: { text: string }, callback: unknown): void {
          const cb = callback as (a: null, b: unknown) => void;
          cb(null, safeLoad(res.text));
        },
      },
    };

    const logger = this.logger;
    return resolveRefs(root, options).then(
      function (results) {
        return results.resolved as Record<string, unknown>;
      },
      function (err: Error) {
        logger.log('warn', `failed to load swagger reference: ${err.message}.`);
      }
    );
  }
}
