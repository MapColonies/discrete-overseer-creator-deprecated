import { InternalServerError } from '../http/internalServerError';

export class KafkaError extends InternalServerError {
  public constructor(message: string);
  public constructor(error: Error, messageOverride?: string);
  public constructor(error: string | Error, messageOverride?: string) {
    if (error instanceof Error) {
      super(error, messageOverride);
    } else {
      super(error);
    }
  }
}
