import { ImageMetadata } from '@map-colonies/mc-model-types';
import httpStatusCodes from 'http-status-codes';
import { container } from 'tsyringe';

import { registerTestValues } from '../testContainerConfig';
import * as requestSender from './helpers/requestSender';

const validTestImageMetadata: ImageMetadata = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  creationTime: new Date('2020-07-13T06:53:16.202Z'),
  imagingTime: new Date('2020-07-13T05:53:16.202Z'),
  resolution: 3.5,
  footprint: {
    type: 'Polygon',
    coordinates: [
      [
        [100, 0],
        [101, 0],
        [101, 1],
        [100, 1],
        [100, 0],
      ],
    ],
  },
  imageSection: 'north',
  imageUri: 'uri',
  height: 300,
  width: 500,
  sensorType: 'RGB',
  imageColorType: 'BW',
  imageBitPerPixel: 24,
  imageFormat: 'tiff',
  isBitSigned: true,
  imageSource: "layer's creator",
  cloudCoverPercentage: 93,
  additionalFilesUri: ['additional file 1 uri', 'additional file 2 uri'],
  geographicReferenceSystem: 4326,
};
const invalidTestImageMetadata = {
  id: 'testId',
  invalidFiled: 'invalid',
};

describe('layers', function () {
  beforeAll(async function () {
    registerTestValues();
    await requestSender.init();
  });
  afterEach(function () {
    container.clearInstances();
  });

  describe('Happy Path', function () {
    it('should return 200 status code', async function () {
      const response = await requestSender.createLayer(validTestImageMetadata);
      expect(response.status).toBe(httpStatusCodes.OK);
    });
  });

  describe('Bad Path', function () {
    // All requests with status code of 400
    it('should return 400 status code', async function () {
      const response = await requestSender.createLayer(invalidTestImageMetadata);
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
