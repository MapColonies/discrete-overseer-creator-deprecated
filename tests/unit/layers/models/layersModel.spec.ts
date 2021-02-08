import { LayerMetadata, SensorType } from '@map-colonies/mc-model-types';
import { IConfig, ILogger } from '../../../../src/common/interfaces';
import { LayersManager } from '../../../../src/layers/models/layersManager';
import { StorageClient } from '../../../../src/serviceClients/storageClient';
import { TillerClient } from '../../../../src/serviceClients/tillerClient';

let layersManager: LayersManager;

//storage client mock
const saveMetadataMock = jest.fn();
const dbMock = ({
  saveMetadata: saveMetadataMock,
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
    saveMetadataMock.mockReset();
    addTilingRequestMock.mockReset();
    configGetMock.mockReset();
    logMock.mockReset();
  });

  describe('createLayer', () => {
    it('saves metadata before queueing tasks', async function () {
      configGetMock.mockImplementation((key: string) => {
        switch (key) {
          case 'tiling.zoomGroups':
            return '[[1],[2]]';
        }
      });
      let saved = false;
      let tiledBeforeSave = false;
      saveMetadataMock.mockImplementation(async () => {
        saved = true;
        return Promise.resolve();
      });
      addTilingRequestMock.mockImplementation(async () => {
        if (!saved) {
          tiledBeforeSave = true;
        }
        return Promise.resolve();
      });
      layersManager = new LayersManager(loggerMock, configMock, tillerMock, dbMock);

      await layersManager.createLayer(testImageMetadata);

      expect(saveMetadataMock).toHaveBeenCalledTimes(1);
      expect(saveMetadataMock).toHaveBeenCalledWith(testImageMetadata);
      expect(addTilingRequestMock).toHaveBeenCalledTimes(2);
      expect(tiledBeforeSave).toBe(false);
    });

    it('split the tasks based on configuration', async function () {
      configGetMock.mockImplementation((key: string) => {
        switch (key) {
          case 'tiling.zoomGroups':
            return '[[1],[8,5],[2]]';
        }
      });
      layersManager = new LayersManager(loggerMock, configMock, tillerMock, dbMock);

      await layersManager.createLayer(testImageMetadata);

      expect(addTilingRequestMock).toHaveBeenCalledTimes(3);
      expect(addTilingRequestMock).toHaveBeenCalledWith(testImageMetadata.source, testImageMetadata.version, [1]);
      expect(addTilingRequestMock).toHaveBeenCalledWith(testImageMetadata.source, testImageMetadata.version, [8, 5]);
      expect(addTilingRequestMock).toHaveBeenCalledWith(testImageMetadata.source, testImageMetadata.version, [2]);
    });
  });
});
