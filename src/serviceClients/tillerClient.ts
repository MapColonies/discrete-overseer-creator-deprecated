import { MCLogger } from '@map-colonies/mc-logger';
import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { KafkaClient, IKafkaConfig } from './clientsBase/kafkaClient';

@injectable()
export class TillerClient extends KafkaClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: MCLogger, @inject(Services.CONFIG) protected readonly config: IConfig) {
    super(logger, config.get<IKafkaConfig>('tilerKafka'));
  }

  public async addTilingRequest(id: string, version: string, zoomLevels: number[]): Promise<void> {
    const data = {
      id: id,
      version: version,
      zoomLevels: zoomLevels,
    };
    const message = JSON.stringify(data);
    await this.sendMessage(message);
  }
}
