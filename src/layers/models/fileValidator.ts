import path from 'path';
import { promises as fsPromises, constants as fsConstants } from 'fs';
import { inject, singleton } from 'tsyringe';
import { Services } from '../../common/constants';
import { BadRequestError } from '../../common/exceptions/http/badRequestError';
import { IConfig, ILogger } from '../../common/interfaces';
import { SQLiteClient } from '../../serviceClients/sqliteClient';

@singleton()
export class FileValidator {
  private readonly sourceMount: string;
  public constructor(@inject(Services.CONFIG) private readonly config: IConfig, @inject(Services.LOGGER) private readonly logger: ILogger) {
    this.sourceMount = config.get('layerSourceDir');
  }

  public validateSourceDirectory(srcDir: string): boolean {
    if (!srcDir) {
      this.logger.log('info', `"originDirectory" is empty, files should be stored on specific directory`);
      return false;
    } else {
      return true;
    }
  }

  public async validateExists(srcDir: string, files: string[]): Promise<boolean> {
    const filePromises = files.map(async (file) => {
      const fullPath = path.join(this.sourceMount, srcDir, file);
      return fsPromises
        .access(fullPath, fsConstants.F_OK)
        .then(() => true)
        .catch(() => false);
    });
    const allValid = (await Promise.all(filePromises)).every((value) => value);
    return allValid;
  }

  public validateGpkgFiles(files: string[], originDirectory: string): boolean {
    const isExtensionValid = this.validateGpkgExtension(files);
    if (!isExtensionValid) {
      return false;
    }
    this.validateGpkgIndex(files, originDirectory);
    return true;
  }

  public validateGpkgIndex(files: string[], originDirectory: string): void {
    files.forEach((file) => {
      const sqliteClient = new SQLiteClient(this.config, this.logger, file, originDirectory);
      const index = sqliteClient.getGpkgIndex();
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!index) {
        throw new BadRequestError(`Geopackage name: ${file} does not have a tiles index`);
      }
    });
  }

  private validateGpkgExtension(files: string[]): boolean {
    if (!Array.isArray(files) || !files.length) {
      return false;
    }
    const validGpkgExt = '.gpkg';
    const allValid = files.every((file) => {
      return path.extname(file).toLowerCase() === validGpkgExt;
    });
    return allValid;
  }
}
