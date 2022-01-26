import { bboxPolygon, featureCollection, polygon } from '@turf/turf';
import { LayerMetadata, ProductType, RecordType, SensorType } from '@map-colonies/mc-model-types';
import { MetadataMerger } from '../../../src/update/metadataMerger';

describe('MetadataMerger', () => {
  let merger: MetadataMerger;

  const baseFootprint = bboxPolygon([0, 0, 5, 5]);
  delete baseFootprint.bbox;
  const basePolygonParts = featureCollection([
    bboxPolygon([0, 0, 4, 5], {
      properties: {
        test: '1',
      },
    }),
    bboxPolygon([4, 0, 5, 4], {
      properties: {
        test: '2',
      },
    }),
    bboxPolygon([4, 4, 5, 5], {
      properties: {
        test: '3',
      },
    }),
  ]);
  basePolygonParts.features.forEach((feat) => {
    delete feat.bbox;
  });
  const baseRawProductData = featureCollection([bboxPolygon([0, 0, 5, 5])]);
  const baseMetadata: LayerMetadata = {
    accuracyCE90: 5,
    classification: '6',
    creationDate: new Date(1, 1, 1),
    description: 'test',
    footprint: baseFootprint,
    includedInBests: [],
    ingestionDate: new Date(1, 1, 5),
    layerPolygonParts: basePolygonParts,
    maxResolutionMeter: 777,
    producerName: 'tester',
    productBoundingBox: '0,0,5,5',
    productId: 'testId',
    productName: 'test',
    productSubType: 'data',
    productType: ProductType.ORTHOPHOTO,
    productVersion: '1.0',
    rawProductData: baseRawProductData,
    region: 'r1,r2,r3',
    resolution: 0.072,
    sensorType: [SensorType.RGB, SensorType.Pan_Sharpen],
    sourceDateEnd: new Date(1, 1, 1),
    sourceDateStart: new Date(1, 1, 1),
    srsId: 'EPSG:4326',
    srsName: 'wgs84',
    type: RecordType.RECORD_RASTER,
    updateDate: new Date(1, 1, 5),
    rms: undefined,
    scale: undefined,
  };

  const updateFootprint = bboxPolygon([4, 3, 7, 7]);
  delete updateFootprint.bbox;
  const updatePolygonParts = featureCollection([
    bboxPolygon([4, 4, 7, 7], {
      properties: {
        test: '4',
      },
    }),
  ]);
  updatePolygonParts.features.forEach((feat) => {
    delete feat.bbox;
  });
  const updateRawProductData = featureCollection([bboxPolygon([4, 4, 7, 7])]);
  const updateMetadata: LayerMetadata = {
    accuracyCE90: 3,
    classification: '6',
    creationDate: new Date(2, 1, 1),
    description: 'test',
    footprint: updateFootprint,
    includedInBests: [],
    ingestionDate: new Date(2, 1, 5),
    layerPolygonParts: updatePolygonParts,
    maxResolutionMeter: 777,
    producerName: 'tester',
    productBoundingBox: '4,4,7,7',
    productId: 'testId',
    productName: 'test',
    productSubType: 'data',
    productType: ProductType.ORTHOPHOTO,
    productVersion: '2.0',
    rawProductData: updateRawProductData,
    region: 'r1,r4',
    resolution: 0.072,
    sensorType: [SensorType.RGB, SensorType.VIS],
    sourceDateEnd: new Date(2, 1, 1),
    sourceDateStart: new Date(2, 1, 1),
    srsId: 'EPSG:4326',
    srsName: 'wgs84',
    type: RecordType.RECORD_RASTER,
    updateDate: new Date(2, 1, 5),
    rms: undefined,
    scale: undefined,
  };

  const expectedFootprint = polygon([
    [
      [0, 0],
      [5, 0],
      [5, 3],
      [7, 3],
      [7, 7],
      [4, 7],
      [4, 5],
      [0, 5],
      [0, 0],
    ],
  ]);
  delete expectedFootprint.bbox;
  const expectedPolygonParts = featureCollection([
    bboxPolygon([0, 0, 4, 5], {
      properties: {
        test: '1',
      },
    }),
    bboxPolygon([4, 0, 5, 3], {
      properties: {
        test: '2',
      },
    }),
    bboxPolygon([4, 4, 7, 7], {
      properties: {
        test: '4',
      },
    }),
  ]);
  expectedPolygonParts.features.forEach((feat) => {
    delete feat.bbox;
  });
  const expectedMetadata: LayerMetadata = {
    accuracyCE90: 5,
    classification: '6',
    creationDate: new Date(1, 1, 1),
    description: 'test',
    footprint: expectedFootprint,
    includedInBests: [],
    ingestionDate: undefined,
    layerPolygonParts: expectedPolygonParts,
    maxResolutionMeter: 777,
    producerName: 'tester',
    productBoundingBox: '0,0,7,7',
    productId: 'testId',
    productName: 'test',
    productSubType: 'data',
    productType: ProductType.ORTHOPHOTO,
    productVersion: '2.0',
    rawProductData: undefined,
    region: 'r1,r2,r3,r4',
    resolution: 0.072,
    sensorType: [SensorType.RGB, SensorType.Pan_Sharpen, SensorType.VIS],
    sourceDateEnd: new Date(2, 1, 1),
    sourceDateStart: new Date(1, 1, 1),
    srsId: 'EPSG:4326',
    srsName: 'wgs84',
    type: RecordType.RECORD_RASTER,
    updateDate: new Date(2, 1, 5),
    rms: undefined,
    scale: undefined,
  };

  beforeEach(() => {
    merger = new MetadataMerger();
  });
  describe('merge', () => {
    it('merges metadata properly', () => {
      const merged = merger.merge(baseMetadata, updateMetadata);
      expect(merged).toEqual(expectedMetadata);
    });
  });
});