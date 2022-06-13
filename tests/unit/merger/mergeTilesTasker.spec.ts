import { tilesGenerator } from '@map-colonies/mc-utils';
import { bboxPolygon, polygon } from '@turf/turf';
import { IMergeOverlaps, IMergeParameters, IMergeTaskParams } from '../../../src/common/interfaces';
import { MergeTilesTasker } from '../../../src/merge/mergeTilesTasker';
import { jobManagerClientMock } from '../../mocks/clients/jobManagerClient';
import { configMock, init as initConfig, setValue as setConfigValue, clear as clearConfig } from '../../mocks/config';
import { logger } from '../../mocks/logger';

describe('MergeTilesTasker', () => {
  let mergeTilesTasker: MergeTilesTasker;

  beforeEach(() => {
    initConfig();
    setConfigValue('ingestionMergeTiles.mergeBatchSize', 1);
    mergeTilesTasker = new MergeTilesTasker(configMock, logger, jobManagerClientMock);
  });

  afterEach(() => {
    clearConfig();
    jest.resetAllMocks();
  });

  describe('createLayerOverLaps', () => {
    it('properly creates all overlaps', () => {
      const layers = [
        {
          id: 'test1',
          tilesPath: 'test/tile1',
          footprint: bboxPolygon([-180, -90, 0, 90]),
        },
        {
          id: 'test2',
          tilesPath: 'test/tile2',
          footprint: bboxPolygon([-180, -90, 90, 0]),
        },
        {
          id: 'test3',
          tilesPath: 'test/tile3',
          footprint: bboxPolygon([-90, -90, 180, 90]),
        },
      ];

      const overlapsGen = mergeTilesTasker.createLayerOverlaps(layers);
      const overlaps: IMergeOverlaps[] = [];
      for (const overlap of overlapsGen) {
        overlaps.push(overlap);
      }

      const expected: IMergeOverlaps[] = [
        {
          layers: [layers[0], layers[1], layers[2]],
          intersection: bboxPolygon([-90, -90, 0, 0]),
        },
        {
          layers: [layers[0], layers[1]],
          intersection: bboxPolygon([-180, -90, -90, 0]),
        },
        {
          layers: [layers[1], layers[2]],
          intersection: bboxPolygon([0, -90, 90, 0]),
        },
        {
          layers: [layers[0], layers[2]],
          intersection: bboxPolygon([-90, 0, 0, 90]),
        },
        {
          layers: [layers[0]],
          intersection: bboxPolygon([-180, 0, -90, 90]),
        },
        {
          layers: [layers[2]],
          intersection: polygon([
            [
              [0, 0],
              [90, 0],
              [90, -90],
              [180, -90],
              [180, 90],
              [0, 90],
              [0, 0],
            ],
          ]),
        },
      ];
      expected.forEach((overlap) => {
        delete overlap.intersection.bbox;
      });

      expect(overlaps).toHaveLength(expected.length);
      expect(overlaps).toEqual(expect.arrayContaining(expected));
    });
  });

  describe('createBatchedTasks', () => {
    it('has no duplicate tiles when tile is split to multiple sources', () => {
      const layers = [
        {
          id: 'test1',
          tilesPath: 'test/tile1',
          footprint: bboxPolygon([-180, -90, 2.8125, 90]),
        },
        {
          id: 'test2',
          tilesPath: 'test/tile2',
          footprint: bboxPolygon([2.8125, -90, 180, 90]),
        },
      ];
      const params: IMergeParameters = {
        layers: layers,
        destPath: 'test/dest',
        maxZoom: 5,
      };

      const taskGen = mergeTilesTasker.createBatchedTasks(params);

      const tiles: Set<string>[] = [new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>()];
      for (const task of taskGen) {
        expect(task.sources[0].path).toEqual('test/dest');
        for (const tile of tilesGenerator(task.batches)) {
          const tileStr = `${tile.zoom}/${tile.x}/${tile.y}`;
          expect(tiles[tile.zoom].has(tileStr)).toBeFalsy();
          tiles[tile.zoom].add(tileStr);
        }
      }

      expect(tiles[0].size).toBe(2);
      expect(tiles[1].size).toBe(8);
      expect(tiles[2].size).toBe(32);
      expect(tiles[3].size).toBe(128);
      expect(tiles[4].size).toBe(512);
      expect(tiles[5].size).toBe(2048);
    });

    it('generates all and only expected tiles', () => {
      const layers = [
        {
          id: 'test1',
          tilesPath: 'test/tile1',
          footprint: bboxPolygon([-180, -90, 0, 90]),
        },
        {
          id: 'test2',
          tilesPath: 'test/tile2',
          footprint: bboxPolygon([-180, -90, 90, 0]),
        },
      ];
      const params: IMergeParameters = {
        layers: layers,
        destPath: 'test/dest',
        maxZoom: 1,
      };

      const taskGen = mergeTilesTasker.createBatchedTasks(params);
      const tasks: IMergeTaskParams[] = [];
      for (const task of taskGen) {
        tasks.push(task);
      }
      const mockSourceType = 'FS';
      const expectedTasks: IMergeTaskParams[] = [
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile1',
            },
            {
              type: mockSourceType,
              path: 'test/tile2',
            },
          ],
          batches: [{ minX: 0, maxX: 1, minY: 0, maxY: 1, zoom: 0 }],
        },
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile2',
            },
          ],
          batches: [{ minX: 1, maxX: 2, minY: 0, maxY: 1, zoom: 0 }],
        },
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile1',
            },
            {
              type: mockSourceType,
              path: 'test/tile2',
            },
          ],
          batches: [{ minX: 0, maxX: 1, minY: 0, maxY: 1, zoom: 1 }],
        },
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile1',
            },
            {
              type: mockSourceType,
              path: 'test/tile2',
            },
          ],
          batches: [{ minX: 1, maxX: 2, minY: 0, maxY: 1, zoom: 1 }],
        },
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile2',
            },
          ],
          batches: [{ minX: 2, maxX: 3, minY: 0, maxY: 1, zoom: 1 }],
        },
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile1',
            },
          ],
          batches: [{ minX: 0, maxX: 1, minY: 1, maxY: 2, zoom: 1 }],
        },
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile1',
            },
          ],
          batches: [{ minX: 1, maxX: 2, minY: 1, maxY: 2, zoom: 1 }],
        },
      ];

      expect(tasks).toHaveLength(expectedTasks.length);
      expect(tasks).toEqual(expect.arrayContaining(expectedTasks));
    });

    it('same footprint', () => {
      const layers = [
        {
          id: 'test1',
          tilesPath: 'test/tile1',
          footprint: bboxPolygon([-180, -90, 0, 90]),
        },
        {
          id: 'test2',
          tilesPath: 'test/tile2',
          footprint: bboxPolygon([-180, -90, 0, 90]),
        },
      ];
      const params: IMergeParameters = {
        layers: layers,
        destPath: 'test/dest',
        maxZoom: 1,
      };

      const taskGen = mergeTilesTasker.createBatchedTasks(params);
      const tasks: IMergeTaskParams[] = [];
      for (const task of taskGen) {
        tasks.push(task);
      }
      const mockSourceType = 'FS';
      const expectedTasks: IMergeTaskParams[] = [
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile1',
            },
            {
              type: mockSourceType,
              path: 'test/tile2',
            },
          ],
          batches: [{ minX: 0, maxX: 1, minY: 0, maxY: 1, zoom: 0 }],
        },
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile1',
            },
            {
              type: mockSourceType,
              path: 'test/tile2',
            },
          ],
          batches: [{ minX: 0, maxX: 1, minY: 0, maxY: 1, zoom: 1 }],
        },
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile1',
            },
            {
              type: mockSourceType,
              path: 'test/tile2',
            },
          ],
          batches: [{ minX: 1, maxX: 2, minY: 0, maxY: 1, zoom: 1 }],
        },
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile1',
            },
            {
              type: mockSourceType,
              path: 'test/tile2',
            },
          ],
          batches: [{ minX: 0, maxX: 1, minY: 1, maxY: 2, zoom: 1 }],
        },
        {
          sources: [
            {
              type: mockSourceType,
              path: 'test/dest',
            },
            {
              type: mockSourceType,
              path: 'test/tile1',
            },
            {
              type: mockSourceType,
              path: 'test/tile2',
            },
          ],
          batches: [{ minX: 1, maxX: 2, minY: 1, maxY: 2, zoom: 1 }],
        },
      ];

      expect(tasks).toHaveLength(expectedTasks.length);
      expect(tasks).toEqual(expect.arrayContaining(expectedTasks));
    });
  });
});
