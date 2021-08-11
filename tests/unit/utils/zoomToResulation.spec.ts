import { ZoomLevelCalculateor } from '../../../src/utils/zoomToResulation';
import { getMock as configGetMock, configMock } from '../../mocks/config';
import { logger } from '../../mocks/logger';

let zoomLevelCalculateor: ZoomLevelCalculateor;

describe('zoomToResulation', () => {
  beforeEach(function () {
    jest.resetAllMocks();
    configGetMock.mockImplementation((key: string) => {
      switch (key) {
        case 'tiling.zoomGroups':
          return '0-10,11,12,13,14,15,16,17,18,19,20,21,22,23';
      }
    });
    zoomLevelCalculateor = new ZoomLevelCalculateor(logger, configMock);
  });

  describe('check zoom by resolution', () => {
    it('Check for resolution bigger than minimum , res >  0.703125, return 0', function () {
      const zoomLevelResult = zoomLevelCalculateor.getZoomByResolution(1);
      expect(zoomLevelResult).toEqual(0);
    });

    it('Check for resolution equal to existing resolution, res = 0.02197265625, // 5, return 5', function () {
      const zoomLevelResult = zoomLevelCalculateor.getZoomByResolution(0.02197265625);
      expect(zoomLevelResult).toEqual(5);
    });

    it('Check for resolution between resolutions returns bigger, 0.02197265625 (zoom 5) > res >  0.010986328125, (zoom 6), return 6', function () {
      const zoomLevelResult = zoomLevelCalculateor.getZoomByResolution(0.01098632813);
      expect(zoomLevelResult).toEqual(6);
    });

    it('Check for resolution smaller than last existing resolution, res < 1.67638063430786e-7, (zoom 22), return 23', function () {
      const zoomLevelResult = zoomLevelCalculateor.getZoomByResolution(0.67638063430786e-7);
      expect(zoomLevelResult).toEqual(23);
    });
  });

  describe('check zoom ranges by resolution and config zoom ranges', () => {
    it('Check for resolution res = 2.14576721191406e-5, zoom level 15 return 6 tasks', function () {
      const zoomLevelResult = zoomLevelCalculateor.createLayerZoomRanges(2.14576721191406e-5);
      expect(zoomLevelResult).toHaveLength(6);
      expect(zoomLevelResult[zoomLevelResult.length - 1].minZoom).toEqual(15);
      expect(zoomLevelResult[zoomLevelResult.length - 1].maxZoom).toEqual(15);
    });

    it('Check for resolution res = 2.04576721191406e-5, zoom level > 15 && zoom level < 16 return 7 tasks', function () {
      const zoomLevelResult = zoomLevelCalculateor.createLayerZoomRanges(2.04576721191406e-5);
      expect(zoomLevelResult).toHaveLength(7);
      expect(zoomLevelResult[zoomLevelResult.length - 1].minZoom).toEqual(16);
      expect(zoomLevelResult[zoomLevelResult.length - 1].maxZoom).toEqual(16);
    });

    it('Check for resolution res = 0.02197265625, zoom level = 5 return 1 task', function () {
      const zoomLevelResult = zoomLevelCalculateor.createLayerZoomRanges(0.02197265625);
      expect(zoomLevelResult).toHaveLength(1);
      expect(zoomLevelResult[zoomLevelResult.length - 1].minZoom).toEqual(0);
      expect(zoomLevelResult[zoomLevelResult.length - 1].maxZoom).toEqual(5);
    });
  });
});
