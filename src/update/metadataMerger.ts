import { singleton } from 'tsyringe';
import { GeoJSON } from 'geojson';
import { Feature, FeatureCollection, union, difference, Polygon, MultiPolygon, featureCollection } from '@turf/turf';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { Footprint } from '@map-colonies/mc-utils';
import { createBBoxString } from '../utils/bbox';

@singleton()
export class MetadataMerger {
  public merge(oldMetadata: LayerMetadata, updateMetadata: LayerMetadata): LayerMetadata {
    const newMetadata: LayerMetadata = {
      ...oldMetadata,
      productVersion: updateMetadata.productVersion,
      updateDate: updateMetadata.updateDate,
      sourceDateEnd: updateMetadata.sourceDateEnd,
      accuracyCE90: Math.max(oldMetadata.accuracyCE90 ?? 0, updateMetadata.accuracyCE90 ?? 0),
      sensorType: this.mergeUniqueArrays(oldMetadata.sensorType, updateMetadata.sensorType),
      layerPolygonParts: this.mergeLayerPolygonParts(oldMetadata.layerPolygonParts, updateMetadata.layerPolygonParts, updateMetadata.footprint),
      footprint: union(oldMetadata.footprint as Footprint, updateMetadata.footprint as Footprint) as GeoJSON,
      region: this.mergeRegions(oldMetadata.region, updateMetadata.region),
      rawProductData: undefined,
      ingestionDate: undefined,
    };
    newMetadata.productBoundingBox = createBBoxString(newMetadata.footprint as Footprint);
    return newMetadata;
  }

  private mergeUniqueArrays<T>(old?: T[], update?: T[]): T[] {
    const merged = new Set<T>();
    old?.forEach((value) => {
      merged.add(value);
    });
    update?.forEach((value) => {
      if (!merged.has(value)) {
        merged.add(value);
      }
    });
    return Array.from(merged);
  }

  private mergeLayerPolygonParts(old?: GeoJSON, update?: GeoJSON, updateFootprint?: GeoJSON): GeoJSON | undefined {
    if (!old) {
      return update;
    } else if (!update) {
      return old;
    }
    const oldFeatures = (old as FeatureCollection).features;
    const updateFeatures = (update as FeatureCollection).features;
    const newFeatures: Feature<Polygon | MultiPolygon>[] = [];
    oldFeatures.forEach((feature) => {
      let updatedFeature: Feature<Polygon | MultiPolygon> | null = { ...(feature as Feature<Polygon | MultiPolygon>) };
      updatedFeature = difference(updatedFeature, updateFootprint as Footprint);
      if (updatedFeature !== null) {
        newFeatures.push(updatedFeature);
      }
    });
    updateFeatures.forEach((feature) => {
      newFeatures.push(feature as Feature<Polygon | MultiPolygon>);
    });
    return featureCollection(newFeatures);
  }

  private mergeRegions(old?: string, update?: string): string {
    const oldArr = old?.split(',') ?? [];
    const updateArr = update?.split(',') ?? [];
    const newArr = this.mergeUniqueArrays(oldArr, updateArr);
    return newArr.join(',');
  }
}
