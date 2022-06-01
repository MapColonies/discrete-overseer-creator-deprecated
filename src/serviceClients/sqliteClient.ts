import { join } from 'path';
import Database, { Database as SQLiteDB } from 'better-sqlite3';
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
  private readonly db: SQLiteDB;

  public constructor(packageName: string) {
    this.logger = container.resolve(Services.LOGGER);
    this.config = container.resolve(Services.CONFIG);
    this.layerSourcesPath = this.config.get<string>('layerSourceDir');
    this.packageName = packageName;
    this.fullPath = join(this.layerSourcesPath, this.packageName);
    this.packageNameWithoutExtension = this.packageName.substring(0, this.packageName.indexOf('.'));
    this.db = new Database(this.fullPath, { fileMustExist: true });
  }

  public getGpkgIndex(): unknown {
    const sql = `SELECT * 
                  FROM sqlite_master 
                    WHERE type = 'index' AND tbl_name='${this.packageNameWithoutExtension}' AND sql LIKE '%zoom_level%'
                     AND sql LIKE '%tile_column%'
                      AND sql LIKE '%tile_row%';`;

    const index = this.runStatement(sql);
    this.closeConnection();
    return index;
  }

  private runStatement(sql: string): unknown {
    this.logger.log('debug', `Executing query ${sql} on DB ${this.fullPath}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const statement = this.db.prepare(sql).get();
    return statement;
  }

  private closeConnection(): void {
    this.logger.log('debug', `Closing connection to GPKG in path ${this.fullPath}`);
    this.db.close();
  }
}
