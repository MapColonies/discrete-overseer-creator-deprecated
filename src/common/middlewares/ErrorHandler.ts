import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { inject, injectable } from 'tsyringe';
import { StatusCodes } from 'http-status-codes';
import { InputValidationError } from 'openapi-validator-middleware';
import { Services } from '../constants';
import { ILogger } from '../interfaces';
import { HttpError } from '../exceptions/http/httpError';

@injectable()
export class ErrorHandler {
  public constructor(@inject(Services.LOGGER) private readonly logger: ILogger) {}

  public getErrorHandlerMiddleware(): ErrorRequestHandler {
    const handler = (
      err: Error,
      req: Request,
      res: Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      next: NextFunction
    ): void => {
      let status: number;
      let body: unknown;
      if (err instanceof InputValidationError) {
        status = StatusCodes.BAD_REQUEST;
        body = {
          message: 'request validation failed',
          validationErrors: err.errors,
        };
      } else if (err instanceof HttpError) {
        status = err.status;
        body = {
          message: err.message,
        };
      } else {
        this.logger.log('error', `${req.method} request to ${req.originalUrl}  has failed with error: ${err.message}`);
        status = StatusCodes.INTERNAL_SERVER_ERROR;
        if (process.env.NODE_ENV === 'development') {
          body = {
            message: err.message,
            stack: err.stack,
          };
        } else {
          body = {
            message: 'Internal Server Error',
          };
        }
      }
      res.status(status).json(body);
    };
    return handler.bind(this);
  }
}
