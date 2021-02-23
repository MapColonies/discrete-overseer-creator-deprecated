import { promises as fsPromises, constants as fsConstants } from 'fs';
import path from 'path';
import { singleton } from 'tsyringe';

@singleton()
export class FileValidator {
  public async validateExists(files: string[]): Promise<boolean> {
    const filePromises = files.map((file) => {
      if (!path.isAbsolute(file)) {
        return false;
      }
      return fsPromises
        .access(file, fsConstants.F_OK)
        .then(() => true)
        .catch(() => false);
    });
    const allValid = (await Promise.all(filePromises)).every((value) => value);
    return allValid;
  }
}
