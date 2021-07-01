import { getZoomByResolution } from '../../../src/utils/zoomToResulation';

describe('zoomToResulation', () => {
  beforeEach(function () {
    jest.resetAllMocks();
  });

  describe('check zoom by resolution', () => {
    it('Check for resolution bigger than minimum , res >  0.703125, return 0', function () {
      const zoomLevelResult = getZoomByResolution(1);
      expect(zoomLevelResult).toEqual(0);
    });

    it('Check for resolution equal to existing resolution, res = 0.02197265625, // 5, return 5', function () {
      const zoomLevelResult = getZoomByResolution(0.02197265625);
      expect(zoomLevelResult).toEqual(5);
    });

    it('Check for resolution between resolutions returns bigger, 0.02197265625 (zoom 5) > res >  0.010986328125, (zoom 6), return 6', function () {
      const zoomLevelResult = getZoomByResolution(0.01098632813);
      expect(zoomLevelResult).toEqual(6);
    });

    it('Check for resolution smaller than last existing resolution, res < 1.67638063430786e-7, (zoom 22), return 23', function () {
      const zoomLevelResult = getZoomByResolution(0.67638063430786e-7);
      expect(zoomLevelResult).toEqual(23);
    });
  });
});
