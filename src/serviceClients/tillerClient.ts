import { MCLogger } from '@map-colonies/mc-logger';
import { IConfig } from 'config';
import { inject, injectable } from 'tsyringe';
import { Services } from '../common/constants';
import { ITillerRequest } from '../tasks/interfaces';
import { KafkaClient, IKafkaConfig } from './clientsBase/kafkaClient';

@injectable()
export class TillerClient extends KafkaClient {
  public constructor(@inject(Services.LOGGER) protected readonly logger: MCLogger, @inject(Services.CONFIG) protected readonly config: IConfig) {
    super(logger, config.get<IKafkaConfig>('tilerKafka'));
  }

  public async addTilingRequest(req: ITillerRequest): Promise<void> {
    const message = JSON.stringify(req);
    await this.sendMessage(message);
  }
}
