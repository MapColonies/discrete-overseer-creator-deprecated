import { ZoomToResolutionUtils } from '../../../src/utils/zoomToResulation';

fdescribe('zoomToResulation', () => {
  beforeEach(function () {
    jest.resetAllMocks();
  });

  describe('check zoom by resolution', () => {
    it('Check for existing, Input: = {2, 3, 4, 4, 5, 6, 7, 9}, X = 4 Output: 2', function () {
      
        ZoomToResolutionUtils.zoomToResolutionArray = [2, 3, 4, 4, 5, 6, 7, 9];

      const expectedOutput = 2;
      const zoomLevelResult = ZoomToResolutionUtils.getZoomByResolution(4);
      expect(zoomLevelResult).toEqual(expectedOutput);
    });

    it('Check for Non-Existing middle of array, Input: = {2, 3, 4, 4, 5, 7, 9}, X = 6 Output: 5', function () {
      
      ZoomToResolutionUtils.zoomToResolutionArray = [2, 3, 4, 4, 5, 7, 9];

    const expectedOutput = 5;
    const zoomLevelResult = ZoomToResolutionUtils.getZoomByResolution(6);
    expect(zoomLevelResult).toEqual(expectedOutput);
  });

    it('Check for bigger then array, Input: = {0, 5, 8, 15}, X = 16 Output: 4', function () {
    
      ZoomToResolutionUtils.zoomToResolutionArray = [0, 5, 8, 15];

    const expectedOutput = 4;
    const zoomLevelResult = ZoomToResolutionUtils.getZoomByResolution(16);
    expect(zoomLevelResult).toEqual(expectedOutput);
    });

    it('Check for lower then array, Input: = {2, 5, 8, 15}, X = 1 Output: 1', function () {
    
      ZoomToResolutionUtils.zoomToResolutionArray = [2, 5, 8, 15];

    const expectedOutput = 0;
    const zoomLevelResult = ZoomToResolutionUtils.getZoomByResolution(1);
    expect(zoomLevelResult).toEqual(expectedOutput);
    });

    it('Check for lower then array, Input: = {2, 5, 8, 15}, X = 1 Output: 1', function () {
    
      ZoomToResolutionUtils.zoomToResolutionArray = [2, 5, 8, 15];

    const expectedOutput = 0;
    const zoomLevelResult = ZoomToResolutionUtils.getZoomByResolution(1);
    expect(zoomLevelResult).toEqual(expectedOutput);
    });

    it('Check for lower then array, Input: = {2, 5, 8, 15}, X = 1 Output: 1', function () {
    
      ZoomToResolutionUtils.zoomToResolutionArray = [
        0.703125, // 0
        0.3515625, // 1
        0.17578125, // 2
        0.087890625, // 3
        0.0439453125, // 4
        0.02197265625, // 5
        0.010986328125, // 6
        0.0054931640625, // 7
        0.00274658203125, // 8
        0.001373291015625, // 9
        0.0006866455078125, // 10
        0.00034332275390625, // 11
        0.000171661376953125, // 12
        8.58306884765625e-5, // 13
        4.29153442382812e-5, // 14
        2.14576721191406e-5, // 15
        1.07288360595703e-5, // 16
        5.36441802978516e-6, // 17
        2.68220901489258e-6, // 18
        1.34110450744629e-6, // 19
        6.70552253723145e-7, // 20
        3.35276126861572e-7, // 21
        1.67638063430786e-7, // 22
      ];

    const expectedOutput = 7;
    const zoomLevelResult = ZoomToResolutionUtils.getZoomByResolution(0.0054931640625);
    expect(zoomLevelResult).toEqual(expectedOutput);
    });
  });
});
