import { join } from 'path';
import Database, { Database as SQLiteDB }from 'better-sqlite3';
import { IConfig } from 'config';
import { container } from 'tsyringe';
import { Services } from '../common/constants';
import { ILogger } from '../common/interfaces';

export class SQLiteClient {
  public readonly packageName: string;
  private readonly fullPath: string;
  private readonly packageNameWithoutExtension: string;
  private readonly layerSourcesPath: string;
  private readonly logger: ILogger;
  private readonly config: IConfig;
  private db?: SQLiteDB;

  public constructor(packageName: string, originDirectory: string) {
    this.logger = container.resolve(Services.LOGGER);
    this.config = container.resolve(Services.CONFIG);
    this.layerSourcesPath = this.config.get<string>('layerSourceDir');
    this.packageName = packageName;
    this.fullPath = join(this.layerSourcesPath, originDirectory, this.packageName);
    this.packageNameWithoutExtension = this.packageName.substring(0, this.packageName.indexOf('.'));
  }

  public getGpkgIndex(): unknown {
    try {
      this.db = new Database(this.fullPath, { fileMustExist: true });
      const sql = `SELECT * 
      FROM sqlite_master 
        WHERE type = 'index' AND tbl_name='${this.packageNameWithoutExtension}' AND sql LIKE '%zoom_level%'
         AND sql LIKE '%tile_column%'
          AND sql LIKE '%tile_row%';`;

      this.logger.log('debug', `Executing query ${sql} on DB ${this.fullPath}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const index = this.db.prepare(sql).get();
      return index;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Failed to validate GPKG index: ${error}`);
    } finally {
      this.logger.log('debug', `Closing connection to GPKG in path ${this.fullPath}`);
      if(this.db) {
        this.db.close();
      }
    }
  }
}
