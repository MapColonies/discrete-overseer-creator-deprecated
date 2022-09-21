import { join } from 'path';
import Database, { Database as SQLiteDB } from 'better-sqlite3';
import { ILogger, IConfig } from '../common/interfaces';
import { Grid } from '../layers/interfaces';

interface IMatrixValues {
  matrixWidth: number;
  matrixHeight: number;
}

export class SQLiteClient {
  public readonly packageName: string;
  private readonly fullPath: string;
  private readonly layerSourcesPath: string;

  public constructor(
    private readonly config: IConfig,
    private readonly logger: ILogger,
    packageName: string,
    originDirectory: string
  ) {
    this.layerSourcesPath = this.config.get<string>('layerSourceDir');
    this.packageName = packageName;
    this.fullPath = join(this.layerSourcesPath, originDirectory, this.packageName);
  }

  public getGpkgIndex(): boolean {
    let db: SQLiteDB | undefined = undefined;
    try {
      db = new Database(this.fullPath, { fileMustExist: true });
      const tableName = this.getGpkgTableName(db);
      return this.getGpkgUniqueConstraintIndex(db, tableName) || this.getGpkgManualIndex(db, tableName);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Failed to validate GPKG index: ${error}`);
    } finally {
      this.logger.log('debug', `Closing connection to GPKG in path ${this.fullPath}`);
      if (db !== undefined) {
        db.close();
      }
    }
  }

  public getGrid(): Grid | undefined {
    let db: SQLiteDB | undefined = undefined;
    try {
      db = new Database(this.fullPath, { fileMustExist: true });

      // get the matrix_width and matrix_height
      const matrixQuery = 'SELECT MAX(matrix_width) as matrixWidth, MAX(matrix_height) as matrixHeight FROM gpkg_tile_matrix';
      const matrixValues = db.prepare(matrixQuery).get() as IMatrixValues;
      const result = Math.round(matrixValues.matrixWidth / matrixValues.matrixHeight);
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if (result === 2) {
        return Grid.TWO_ON_ONE;
      } else if (result === 1) {
        return Grid.ONE_ON_ONE;
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Failed to get grid type: ${error}`);
    } finally {
      this.logger.log('debug', `Closing connection to GPKG in path ${this.fullPath}`);
      if (db !== undefined) {
        db.close();
      }
    }
  }

  private getGpkgManualIndex(db: SQLiteDB, tableName: string): boolean {
    const sql = `SELECT count(*) as count
      FROM sqlite_master 
        WHERE type = 'index' AND tbl_name='${tableName}' AND sql LIKE '%zoom_level%'
         AND sql LIKE '%tile_column%'
          AND sql LIKE '%tile_row%';`;

    this.logger.log('debug', `Executing query ${sql} on DB ${this.fullPath}`);
    const indexCount = (db.prepare(sql).get() as { count: number }).count;
    return indexCount != 0;
  }

  private getGpkgUniqueConstraintIndex(db: SQLiteDB, tableName: string): boolean {
    let sql = `SELECT name FROM pragma_index_list('${tableName}') WHERE "unique" = 1 AND origin = 'u';`;
    this.logger.log('debug', `Executing query ${sql} on DB ${this.fullPath}`);
    const indexes = db.prepare(sql).all() as { name: string }[];
    for (const index of indexes) {
      sql = `SELECT name FROM pragma_index_info('${index.name}');`;
      this.logger.log('debug', `Executing query ${sql} on DB ${this.fullPath}`);
      const cols = (db.prepare(sql).all() as { name: string }[]).map((c) => c.name);
      if (cols.includes('tile_column') && cols.includes('tile_row') && cols.includes('zoom_level')) {
        return true;
      }
    }
    return false;
  }

  private getGpkgTableName(db: SQLiteDB): string {
    const sql = `SELECT table_name FROM "gpkg_contents";`;
    this.logger.log('debug', `Executing query ${sql} on DB ${this.fullPath}`);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const tableNames = db.prepare(sql).all() as { table_name: string }[];
    if (tableNames.length !== 1) {
      throw new Error('invalid gpkg, should have single table name');
    }
    this.logger.log('debug', `Extract table name: ${tableNames[0].table_name}`);
    return tableNames[0].table_name;
  }
}
