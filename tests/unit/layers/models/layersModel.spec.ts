import { LayerMetadata, SensorType } from '@map-colonies/mc-model-types';
import { IConfig, ILogger } from '../../../../src/common/interfaces';
import { LayersManager } from '../../../../src/layers/models/layersManager';
import { StorageClient } from '../../../../src/serviceClients/storageClient';
import { TillerClient } from '../../../../src/serviceClients/tillerClient';

let layersManager: LayersManager;

//storage client mock
const createLayerTasksMock = jest.fn();
const updateTaskStatusMock = jest.fn();
const dbMock = ({
  createLayerTasks: createLayerTasksMock,
  updateTaskStatus: updateTaskStatusMock,
} as unknown) as StorageClient;

//tiller client mock
const addTilingRequestMock = jest.fn();
const tillerMock = ({
  addTilingRequest: addTilingRequestMock,
} as unknown) as TillerClient;

//config mock
const configGetMock = jest.fn();
const configMock = ({
  get: configGetMock,
} as unknown) as IConfig;

//logger mock
const logMock = jest.fn();
const loggerMock = {
  log: logMock,
} as ILogger;

const testImageMetadata: LayerMetadata = {
  source: 'test',
  version: '1.22',
  sourceName: 'test name',
  dsc: 'test desc',
  ep90: 3,
  resolution: 0.3,
  rms: 0.5,
  scale: '3',
  sensorType: SensorType.OTHER,
  updateDate: new Date('01/01/2020'),
  fileUris: [],
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
        [0, 0],
      ],
    ],
  },
};
describe('LayersManager', () => {
  beforeEach(function () {
    jest.resetAllMocks();
  });

  describe('createLayer', () => {
    it('saves metadata before queueing tasks', async function () {
      configGetMock.mockImplementation((key: string) => {
        switch (key) {
          case 'tiling.zoomGroups':
            return '1,2-3';
        }
      });
      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.source,
          version: testImageMetadata.version,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.source,
          version: testImageMetadata.version,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 2,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 3,
        },
      ];
      let saved = false;
      let tiledBeforeSave = false;
      createLayerTasksMock.mockImplementation(async () => {
        saved = true;
        return Promise.resolve(tillingReqs);
      });
      addTilingRequestMock.mockImplementation(async () => {
        if (!saved) {
          tiledBeforeSave = true;
        }
        return Promise.resolve();
      });
      layersManager = new LayersManager(loggerMock, configMock, tillerMock, dbMock);

      await layersManager.createLayer(testImageMetadata);

      expect(createLayerTasksMock).toHaveBeenCalledTimes(1);
      expect(createLayerTasksMock).toHaveBeenCalledWith(testImageMetadata, [
        { minZoom: 1, maxZoom: 1 },
        { minZoom: 2, maxZoom: 3 },
      ]);
      expect(addTilingRequestMock).toHaveBeenCalledTimes(2);
      expect(tiledBeforeSave).toBe(false);
    });

    it('split the tasks based on configuration', async function () {
      const tillingReqs = [
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.source,
          version: testImageMetadata.version,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '1',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 1,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 1,
        },
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.source,
          version: testImageMetadata.version,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '2',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 5,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 8,
        },
        {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          discrete_id: testImageMetadata.source,
          version: testImageMetadata.version,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          task_id: '3',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          min_zoom_level: 2,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          max_zoom_level: 2,
        },
      ];
      createLayerTasksMock.mockResolvedValue(tillingReqs);
      configGetMock.mockImplementation((key: string) => {
        switch (key) {
          case 'tiling.zoomGroups':
            return '1,8-5,2';
        }
      });
      layersManager = new LayersManager(loggerMock, configMock, tillerMock, dbMock);

      await layersManager.createLayer(testImageMetadata);

      expect(createLayerTasksMock).toHaveBeenCalledWith(testImageMetadata, [
        { minZoom: 1, maxZoom: 1 },
        { minZoom: 5, maxZoom: 8 },
        { minZoom: 2, maxZoom: 2 },
      ]);
      expect(addTilingRequestMock).toHaveBeenCalledTimes(3);
      expect(addTilingRequestMock).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        discrete_id: testImageMetadata.source,
        version: testImageMetadata.version,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        task_id: '1',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        min_zoom_level: 1,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        max_zoom_level: 1,
      });
      expect(addTilingRequestMock).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        discrete_id: testImageMetadata.source,
        version: testImageMetadata.version,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        task_id: '2',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        min_zoom_level: 5,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        max_zoom_level: 8,
      });
      expect(addTilingRequestMock).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        discrete_id: testImageMetadata.source,
        version: testImageMetadata.version,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        task_id: '3',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        min_zoom_level: 2,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        max_zoom_level: 2,
      });
    });
  });
});
