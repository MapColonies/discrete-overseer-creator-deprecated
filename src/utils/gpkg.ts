import { BBox, bbox } from '@turf/turf';
import { GeoJSON } from 'geojson';
import { Grid } from '../layers/interfaces';
import { SQLiteClient } from '../serviceClients/sqliteClient';

export const getGrids = (files: string[], originDirectory: string): Grid[] => {
  const grids: Grid[] = [];
  files.forEach((file) => {
    const sqliteClient = new SQLiteClient(file, originDirectory);
    const grid = sqliteClient.getGrid();
    grids.push(grid as Grid);
  });

  return grids;
};

export const getExtents = (polygon: GeoJSON): BBox => {
  return bbox(polygon);
};
