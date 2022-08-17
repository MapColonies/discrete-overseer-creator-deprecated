import { SourceType } from '../common/enums';
import { Origin } from '../layers/interfaces';

export function getOrigin(type: string): Origin {
  return type.toUpperCase() == SourceType.GPKG ? Origin.UPPER_LEFT : Origin.LOWER_LEFT;
}
