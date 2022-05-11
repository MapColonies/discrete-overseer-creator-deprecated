/* eslint-disable @typescript-eslint/naming-convention */
import Database, { Database as SQLiteDB } from 'better-sqlite3';
import { BBox } from '@turf/helpers';

interface BBOXRowResponse {
  min_x: number;
  min_y: number;
  max_x: number;
  max_y: number;
}

export const getGpkgBoundingBox = (filePath: string): BBox | undefined => {
  try {
    const db = new Database(filePath, { fileMustExist: true });
    const query = `SELECT min_x, min_y, max_x, max_y FROM gpkg_contents`;
    const row = db.prepare(query).all() as BBOXRowResponse[];
    db.close();
    if (row.length) {
      const result = row[0];
      const bbox = Object.values(result);
      return bbox as BBox;
    }
  } catch (error) {
    console.log(error);
  }
};
