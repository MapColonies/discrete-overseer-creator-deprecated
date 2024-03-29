import { inject, singleton } from 'tsyringe';
import { compile } from 'handlebars';
import { Link } from '@map-colonies/mc-model-types';
import { Services } from '../../common/constants';
import { IConfig, ILogger } from '../../common/interfaces';
import { FilesManager } from '../../utils/filesManager';

export interface ILinkBuilderData {
  serverUrl: string;
  layerName: string;
}

@singleton()
export class LinkBuilder {
  private readonly compiledTemplate: HandlebarsTemplateDelegate;

  public constructor(
    @inject(Services.LOGGER) private readonly logger: ILogger,
    @inject(Services.CONFIG) private readonly config: IConfig,
    filesManager: FilesManager
  ) {
    const templatePath = this.config.get<string>('linkTemplatesPath');
    const template = filesManager.readFileSync(templatePath, { encoding: 'utf8' });
    this.compiledTemplate = compile(template, { noEscape: true });
  }

  public createLinks(data: ILinkBuilderData): Link[] {
    const linksJson = this.compiledTemplate(data);
    const links = JSON.parse(linksJson) as Link[];
    return links;
  }
}
