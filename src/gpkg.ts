/* eslint-disable @typescript-eslint/naming-convention */
import { join } from 'path';
import Database, { Database as SQLiteDB } from 'better-sqlite3';
import { inject } from 'tsyringe';
import { IConfig } from 'config';
import { BBox } from '@turf/helpers';
import { container } from 'tsyringe';
import { ILogger } from '../src/common/interfaces';
import { Services } from './common/constants';

export class GPKGHandler {
  private readonly logger: ILogger;
  private readonly config: IConfig;
  private readonly db: SQLiteDB;
  private readonly packageName: string;
  private readonly fullPath: string;
  private readonly tilesTable: string;
  private readonly sourceDir: string;

  public constructor(packageName: string) {
    this.logger = container.resolve(Services.LOGGER);
    this.config = container.resolve(Services.CONFIG);
    this.packageName = packageName;
    this.tilesTable = this.packageName.substring(0, this.packageName.indexOf('.'));
    this.sourceDir = this.config.get<string>('LayerSourceDir');
    this.fullPath = join(this.sourceDir, this.packageName);
    this.db = new Database(this.fullPath, { fileMustExist: true });
  }

  public closeConnection(): void {
    this.logger.log('info', `Closing connection to GPKG in path ${this.fullPath}`);
    this.db.close();
}

  public getMinMaxCoordinates(): any {
    try {
      const maxZoom =
      const minXquery = `SELECT MAX(tile_column) FROM ${this.tilesTable} ORDER BY tile_column ASC LIMIT 1;`;
      const minXCoodinate = this.db.prepare(minXquery).all();
      console.log(row);
    } catch (error) {
      console.log(error);
    }
  }
}
