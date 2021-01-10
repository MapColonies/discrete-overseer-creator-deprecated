import { KafkaError } from './KafkaError';

export class KafkaDisconnectError extends KafkaError {
  public constructor(message: string, stack?: string) {
    super({
      name: 'ERR_KAFKA_DISCONNECT',
      message: `Failed to disconnect from kafka: ${message}`,
      stack,
    });
  }
}
