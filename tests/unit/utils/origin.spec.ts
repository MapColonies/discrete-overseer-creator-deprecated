import { Origin } from '../../../src/layers/interfaces';
import { getOrigin } from '../../../src/utils/origin';

describe('layerNameGenerator', () => {
  describe('check getting origin from source type', () => {
    it('returns UL origin on type gpkg', function () {
      const type = 'gpkg';
      const origin = getOrigin(type);
      expect(origin).toEqual(Origin.UPPER_LEFT);
      expect(origin.toUpperCase()).toEqual(Origin.UPPER_LEFT);
    });

    it('returns LL origin on type fs', function () {
      const type = 'fs';
      const origin = getOrigin(type);
      expect(origin).toEqual(Origin.LOWER_LEFT);
      expect(origin.toUpperCase()).toEqual(Origin.LOWER_LEFT);
    });

    it('returns LL origin on type s3', function () {
      const type = 's3';
      const origin = getOrigin(type);
      expect(origin).toEqual(Origin.LOWER_LEFT);
      expect(origin.toUpperCase()).toEqual(Origin.LOWER_LEFT);
    });
  });
});
