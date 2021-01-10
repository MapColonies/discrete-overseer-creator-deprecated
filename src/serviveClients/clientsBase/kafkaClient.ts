import { Kafka, Producer, Partitioners, KafkaConfig } from 'kafkajs';
import { KafkaConnectionError } from '../../common/exceptions/kafka/kafkaConnectionError';
import { KafkaDisconnectError } from '../../common/exceptions/kafka/KafkaDisconnectError';
import { KafkaSendError } from '../../common/exceptions/kafka/kafkaSendError';
import { ILogger } from '../../common/interfaces';

export interface IKafkaConfig {
  clientId: string;
  brokers: string | string[];
  topic: string;
}

export abstract class KafkaClient {
  protected producer: Producer;

  public constructor(protected readonly logger: ILogger, protected readonly kafkaConfig: IKafkaConfig) {
    if (typeof this.kafkaConfig.brokers === 'string') {
      this.kafkaConfig.brokers = this.kafkaConfig.brokers.split(' ');
    }

    logger.log(
      'info',
      `Kafka manager created clientId=${this.kafkaConfig.clientId}, topic=${this.kafkaConfig.topic} brokers=${JSON.stringify(
        this.kafkaConfig.brokers
      )}`
    );
    const internalKafkaConfig: KafkaConfig = {
      clientId: this.kafkaConfig.clientId,
      brokers: this.kafkaConfig.brokers,
    };
    const kafka = new Kafka(internalKafkaConfig);
    this.producer = kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
    });
  }

  protected async sendMessage(message: string): Promise<void> {
    this.logger.log('debug', `sendMessage to kafka: message=${message}`);
    try {
      await this.internalSendMessage(message);
    } catch (error) {
      this.logger.log('error', `Failed sending message to kafka, message=${message}`);
      throw error;
    }
  }

  protected async internalSendMessage(message: string): Promise<void> {
    try {
      await this.producer.connect();
    } catch (error) {
      const err = error as Error;
      throw new KafkaConnectionError(err.message, err.stack);
    }

    try {
      await this.producer.send({
        topic: this.kafkaConfig.topic,
        messages: [
          {
            value: message,
          },
        ],
      });
    } catch (error) {
      const err = error as Error;
      throw new KafkaSendError(message, err.message, err.stack);
    }

    try {
      await this.producer.disconnect();
    } catch (error) {
      const err = error as Error;
      throw new KafkaDisconnectError(err.message, err.stack);
    }
  }
}
