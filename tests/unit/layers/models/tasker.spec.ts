import { IngestionParams, LayerMetadata, ProductType, RecordType, SensorType } from '@map-colonies/mc-model-types';
import { Tasker } from '../../../../src/layers/models/tasker';
import { configMock, init as initConfig, setValue } from '../../../mocks/config';

describe('Tasker', () => {
  let tasker: Tasker;

  const testImageMetadata: LayerMetadata = {
    productId: 'test',
    productVersion: '1.22',
    productName: 'test name',
    description: 'test desc',
    accuracyCE90: 3,
    resolution: 2.68220901489258e-6,
    rms: 0.5,
    scale: '3',
    sensorType: [SensorType.OTHER],
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
    region: '',
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

  const paramTemplate = {
    discreteId: 'test',
    version: '1.22',
    fileNames: ['file.test'],
    originDirectory: '/here',
    layerRelativePath: `test/1.22/OrthophotoHistory`,
  };

  beforeEach(() => {
    initConfig();
  });

  describe('generateTasksParameters', () => {
    it('generate tasks for multiple ranges', () => {
      setValue('bboxSizeTiles', 10000);
      const zoomRanges = [
        { minZoom: 1, maxZoom: 1 },
        { minZoom: 5, maxZoom: 8 },
        { minZoom: 2, maxZoom: 2 },
      ];
      tasker = new Tasker(configMock);

      const params = tasker.generateTasksParameters(testData, zoomRanges);

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
