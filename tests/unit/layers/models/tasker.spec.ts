import { IngestionParams, LayerMetadata, ProductType, RecordType } from '@map-colonies/mc-model-types';
import { JobType } from '../../../../src/common/enums';
import { Tasker } from '../../../../src/layers/models/tasker';
import { ZoomLevelCalculator } from '../../../../src/utils/zoomToResolution';
import { jobManagerClientMock } from '../../../mocks/clients/jobManagerClient';
import { configMock, init as initConfig, setValue } from '../../../mocks/config';
import { logger } from '../../../mocks/logger';
import { generateTasksParametersMock } from '../../../mocks/tasker';

describe('Tasker', () => {
  let tasker: Tasker;
  let generateTasksParametersSpy: jest.SpyInstance;

  const testImageMetadata: LayerMetadata = {
    productId: 'test',
    productVersion: '1.22',
    productName: 'test name',
    description: 'test desc',
    minHorizontalAccuracyCE90: 3,
    maxResolutionDeg: 2.68220901489258e-6,
    rms: 0.5,
    scale: 3,
    sensors: ['OTHER', 'Test'],
    updateDate: new Date('01/01/2020'),
    footprint: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0, 90],
          [90, 90],
          [90, 0],
          [0, 0],
        ],
      ],
    },
    classification: '',
    creationDate: new Date('02/01/2020'),
    ingestionDate: new Date('03/01/2020'),
    producerName: 'testProducer',
    productType: ProductType.ORTHOPHOTO_HISTORY,
    productSubType: undefined,
    region: ['testRegion1', 'testRegion2'],
    sourceDateEnd: new Date('06/01/2020'),
    sourceDateStart: new Date('05/01/2020'),
    srsId: '4326',
    srsName: 'WGS84GEO',
    type: RecordType.RECORD_RASTER,
    layerPolygonParts: undefined,
    includedInBests: undefined,
    maxResolutionMeter: 0.2,
    productBoundingBox: undefined,
    rawProductData: undefined,
  };

  const testData: IngestionParams = {
    fileNames: ['file.test'],
    metadata: testImageMetadata,
    originDirectory: '/here',
  };
  const layerRelativePath = `test/OrthophotoHistory`;
  const paramTemplate = {
    discreteId: 'test',
    version: '1.22',
    originDirectory: '/here',
    layerRelativePath: layerRelativePath,
  };

  beforeEach(() => {
    initConfig();
  });

  describe('createIngestionTask', () => {
    it('split the tasks based on configuration', async function () {
      tasker = new Tasker(configMock, jobManagerClientMock);
      generateTasksParametersSpy = jest.spyOn(Tasker.prototype, "generateTasksParameters")

      setValue({ 'tiling.zoomGroups': '1,8-5,2' });
      await tasker.createIngestionTask(testData, layerRelativePath, [
        { minZoom: 1, maxZoom: 1 },
        { minZoom: 5, maxZoom: 8 },
        { minZoom: 2, maxZoom: 2 },
      ], JobType.DISCRETE_TILING);

      expect(generateTasksParametersSpy).toHaveBeenCalledTimes(1);
      expect(generateTasksParametersSpy).toHaveBeenCalledWith(testData, layerRelativePath, [
        { minZoom: 1, maxZoom: 1 },
        { minZoom: 5, maxZoom: 8 },
        { minZoom: 2, maxZoom: 2 },
      ]);
    });
  });

  describe('generateTasksParameters', () => {
    it('generate tasks for multiple ranges', () => {
      setValue('bboxSizeTiles', 10000);
      const zoomRanges = [
        { minZoom: 1, maxZoom: 1 },
        { minZoom: 5, maxZoom: 8 },
        { minZoom: 2, maxZoom: 2 },
      ];
      tasker = new Tasker(configMock, jobManagerClientMock);

      const gen = tasker.generateTasksParameters(testData, layerRelativePath, zoomRanges);
      const params = [];
      for (const param of gen) {
        params.push(param);
      }

      const expectedTasks = [
        { ...paramTemplate, minZoom: 1, maxZoom: 1, bbox: [0, -90, 180, 90] },
        { ...paramTemplate, minZoom: 5, maxZoom: 8, bbox: [0, 0, 45, 45] },
        { ...paramTemplate, minZoom: 5, maxZoom: 8, bbox: [0, 45, 45, 90] },
        { ...paramTemplate, minZoom: 5, maxZoom: 8, bbox: [45, 0, 90, 45] },
        { ...paramTemplate, minZoom: 5, maxZoom: 8, bbox: [45, 45, 90, 90] },
        { ...paramTemplate, minZoom: 2, maxZoom: 2, bbox: [0, -90, 180, 90] },
      ];

      expect(params).toEqual(expectedTasks);
    });
  });
});
