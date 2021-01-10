import { KafkaError } from './KafkaError';

export class KafkaSendError extends KafkaError {
  public constructor(messageToKafka: string, errorMessage: string, errorStack?: string) {
    super({
      name: 'ERR_KAFKA_MESSAGE',
      message: `Failed to send message to kafka: ${errorMessage}. Message=${messageToKafka}`,
      stack: errorStack,
    });
  }
}
