import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import HttpStatus from 'http-status-codes';
import { BadRequestError } from '../../common/exceptions/http/badRequestError';
import { HttpError } from '../../common/exceptions/http/httpError';
import { InternalServerError } from '../../common/exceptions/http/internalServerError';
import { NotFoundError } from '../../common/exceptions/http/notFoundError';
import { ILogger } from '../../common/interfaces';

export abstract class HttpClient {
  protected targetService = '';
  protected axiosOptions: AxiosRequestConfig = {};

  public constructor(protected readonly logger: ILogger) {}

  protected async get<T>(url: string): Promise<T> {
    try {
      const res = await axios.get<T>(url, this.axiosOptions);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err);
      throw error;
    }
  }

  protected async post<T>(url: string, body?: unknown): Promise<T> {
    try {
      const res = await axios.post<T>(url, body, this.axiosOptions);
      return res.data;
    } catch (err) {
      const error = this.wrapError(url, err, body);
      throw error;
    }
  }

  private wrapError(url: string, err: AxiosError, body?: unknown): HttpError {
    switch (err.response?.status) {
      case HttpStatus.BAD_REQUEST:
        if (body !== undefined) {
          body = JSON.stringify(body);
          this.logger.log('debug', `invalid request sent to ${this.targetService} at ${url}. body: ${body as string}. error: ${err.message}`);
        } else {
          this.logger.log('debug', `invalid request sent to ${this.targetService} at ${url}. error: ${err.message}`);
        }
        return new BadRequestError(err);
      case HttpStatus.NOT_FOUND:
        this.logger.log('debug', `request url not found for service ${this.targetService}, target url: ${url}, error: ${err.message}`);
        return new NotFoundError(err);
      default:
        if (body !== undefined) {
          body = JSON.stringify(body);
          this.logger.log('error', `error from ${this.targetService} at ${url}. body: ${body as string}. error: ${err.message}`);
        } else {
          this.logger.log('error', `error from ${this.targetService} at ${url}. error: ${err.message}`);
        }
        return new InternalServerError(err);
    }
  }
}
