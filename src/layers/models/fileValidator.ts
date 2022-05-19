import { promises as fsPromises, constants as fsConstants } from 'fs';
import path from 'path';
import { inject, singleton } from 'tsyringe';
import { Services } from '../../common/constants';
import { IConfig } from '../../common/interfaces';

@singleton()
export class FileValidator {
  private readonly sourceMount: string;
  public constructor(@inject(Services.CONFIG) config: IConfig) {
    this.sourceMount = config.get('LayerSourceDir');
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

  public validateGpkgFiles(files: string[]): boolean {
    const validGpkgExt = '.gpkg';
    const allValid = files.every((file) => {
      return path.extname(file) === validGpkgExt;
    });
    return allValid;
  }

  public validateTiffsFiles(files: string[]): boolean {
    const validTiffExt = ['.tiff', '.tif'];
    const allValid = files.every((file) => {
      return validTiffExt.some((ext) => ext === path.extname(file));
    });
    return allValid;
  }
}
