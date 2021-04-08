import { ConnectionOptions } from 'tls';
import { readFileSync } from 'fs';
import { Kafka, Producer, Partitioners, KafkaConfig, RetryOptions } from 'kafkajs';
import { inject } from 'tsyringe';
import { Services } from '../../common/constants';
import { KafkaConnectionError } from '../../common/exceptions/kafka/kafkaConnectionError';
import { KafkaDisconnectError } from '../../common/exceptions/kafka/KafkaDisconnectError';
import { KafkaSendError } from '../../common/exceptions/kafka/kafkaSendError';
import { ILogger } from '../../common/interfaces';

export interface IKafkaSSLOptions {
  rejectUnauthorized: boolean;
  ca: string;
  key: string;
  cert: string;
}

export interface IKafkaConfig {
  clientId: string;
  brokers: string | string[];
  topic: string;
  retry: RetryOptions;
  ssl: IKafkaSSLOptions;
}

export abstract class KafkaClient {
  protected producer: Producer;

  public constructor(@inject(Services.LOGGER) protected readonly logger: ILogger, protected readonly kafkaConfig: IKafkaConfig) {
    logger.log(
      'info',
      `Kafka manager created clientId=${this.kafkaConfig.clientId}, topic=${this.kafkaConfig.topic} brokers=${JSON.stringify(
        this.kafkaConfig.brokers
      )}`
    );
    let brokers = this.kafkaConfig.brokers;
    if (typeof brokers === 'string' || brokers instanceof String) {
      if (brokers.startsWith('[')) {
        brokers = JSON.parse(brokers as string) as string[];
      } else {
        brokers = brokers.split(',');
      }
    }
    const sslOptions = this.parseSSLOptions();
    const internalKafkaConfig: KafkaConfig = {
      clientId: this.kafkaConfig.clientId,
      brokers: brokers,
      retry: kafkaConfig.retry,
      ssl: sslOptions,
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

  private parseSSLOptions(): ConnectionOptions | undefined {
    if (this.kafkaConfig.ssl.ca && this.kafkaConfig.ssl.cert && this.kafkaConfig.ssl.key) {
      return {
        rejectUnauthorized: this.kafkaConfig.ssl.rejectUnauthorized,
        ca: readFileSync(this.kafkaConfig.ssl.ca, 'utf-8'),
        cert: readFileSync(this.kafkaConfig.ssl.cert, 'utf-8'),
        key: readFileSync(this.kafkaConfig.ssl.key, 'utf-8'),
      };
    }
    return undefined;
  }
}
