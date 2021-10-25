import { ProductType } from '@map-colonies/mc-model-types';

export function getMapServingLayerName(productId: string, productVersion: string, productType: ProductType): string {
  let layerName = null;
  if (productType === ProductType.ORTHOPHOTO) {
    layerName = `${productId}-${productType}`;
  } else {
    layerName = `${productId}-${productVersion}-${productType as string}`;
  }
  return layerName;
}
