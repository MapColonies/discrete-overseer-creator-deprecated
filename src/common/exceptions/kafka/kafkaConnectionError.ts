import { KafkaError } from './KafkaError';

export class KafkaConnectionError extends KafkaError {
  public constructor(message: string, stack?: string) {
    super({
      name: 'ERR_KAFKA_CONNECTION',
      message: `Failed to connect to kafka: ${message}`,
      stack,
    });
  }
}
