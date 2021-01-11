import { MCLogger } from '@map-colonies/mc-logger';
import { IConfig } from 'config';
import { injectable } from 'tsyringe';
import { KafkaClient, IKafkaConfig } from './clientsBase/kafkaClient';

@injectable()
export class TillerClient extends KafkaClient {
  public constructor(protected readonly logger: MCLogger, protected readonly config: IConfig) {
    super(logger, config.get<IKafkaConfig>('tilerKafka'));
  }

  public async addTilingRequest(id: string, files: string[], zoom: number): Promise<void> {
    const data = {
      id: id,
      files: files,
      zoom: zoom,
    };
    const message = JSON.stringify(data);
    await this.sendMessage(message);
  }
}
