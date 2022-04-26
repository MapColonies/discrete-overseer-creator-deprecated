import { singleton } from 'tsyringe';
import { GeoJSON, Geometry } from 'geojson';
import { Feature, FeatureCollection, union, difference, Polygon, MultiPolygon, featureCollection, bbox } from '@turf/turf';
import { LayerMetadata } from '@map-colonies/mc-model-types';
import { Footprint } from '@map-colonies/mc-utils';
import { createBBoxString } from '../utils/bbox';

@singleton()
export class MetadataMerger {
  public merge(oldMetadata: LayerMetadata, updateMetadata: LayerMetadata): LayerMetadata {
    const newMetadata: LayerMetadata = {
      ...oldMetadata,
      productVersion: updateMetadata.productVersion,
      updateDate: new Date(),
      sourceDateStart:
        (oldMetadata.sourceDateStart as Date) <= (updateMetadata.sourceDateStart as Date)
          ? oldMetadata.sourceDateStart
          : updateMetadata.sourceDateStart,
      sourceDateEnd:
        (oldMetadata.sourceDateEnd as Date) >= (updateMetadata.sourceDateEnd as Date) ? oldMetadata.sourceDateEnd : updateMetadata.sourceDateEnd,
      minHorizontalAccuracyCE90: Math.max(oldMetadata.minHorizontalAccuracyCE90 ?? 0, updateMetadata.minHorizontalAccuracyCE90 ?? 0),
      layerPolygonParts: this.mergeLayerPolygonParts(updateMetadata, oldMetadata.layerPolygonParts),
      footprint: union(oldMetadata.footprint as Footprint, updateMetadata.footprint as Footprint) as GeoJSON,
      region: this.mergeUniqueArrays(oldMetadata.region, updateMetadata.region),
      rawProductData: undefined,
      maxResolutionDeg: Math.min(oldMetadata.maxResolutionDeg as number, updateMetadata.maxResolutionDeg as number),
      maxResolutionMeter: Math.min(oldMetadata.maxResolutionMeter as number, updateMetadata.maxResolutionMeter as number),
      classification: this.mergeClassification(oldMetadata.classification, updateMetadata.classification),
    };
    newMetadata.productBoundingBox = createBBoxString(newMetadata.footprint as Footprint);
    newMetadata.sensors = this.polygonPartsToSensors(newMetadata.layerPolygonParts as FeatureCollection);
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

  private mergeLayerPolygonParts(updateMetadata: LayerMetadata, oldPolygonParts?: GeoJSON): GeoJSON | undefined {
    let updatePolygonParts = updateMetadata.layerPolygonParts;
    if (!oldPolygonParts) {
      return updatePolygonParts;
    } else if (!updateMetadata.layerPolygonParts) {
      updatePolygonParts = this.layerMetadataToPolygonParts(updateMetadata);
    }
    const updateFootprint = updateMetadata.footprint as Footprint;
    const oldFeatures = (oldPolygonParts as FeatureCollection).features;
    const updateFeatures = (updatePolygonParts as FeatureCollection).features;
    const newFeatures: Feature<Polygon | MultiPolygon>[] = [];
    oldFeatures.forEach((feature) => {
      let updatedFeature: Feature<Polygon | MultiPolygon> | null = { ...(feature as Feature<Polygon | MultiPolygon>) };
      updatedFeature = difference(updatedFeature, updateFootprint);
      if (updatedFeature !== null) {
        newFeatures.push(updatedFeature);
      }
    });
    updateFeatures.forEach((feature) => {
      newFeatures.push(feature as Feature<Polygon | MultiPolygon>);
    });
    return featureCollection(newFeatures);
  }

  private layerMetadataToPolygonParts(metadata: LayerMetadata): GeoJSON {
    return {
      bbox: bbox(metadata.footprint as GeoJSON),
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: metadata.footprint as Geometry,
          properties: {
            /* eslint-disable @typescript-eslint/naming-convention */
            Dsc: metadata.description,
            Rms: metadata.rms ?? null,
            Ep90: metadata.minHorizontalAccuracyCE90 ?? null,
            Scale: metadata.scale ?? null,
            Cities: null,
            Source: `${metadata.productId as string}-${metadata.productVersion as string}`,
            Countries: metadata.region?.join(',') ?? '',
            Resolution: metadata.maxResolutionDeg?.toString(),
            SensorType: metadata.sensors?.join(',') ?? '',
            SourceName: metadata.productName,
            UpdateDate: metadata.sourceDateEnd?.toLocaleDateString('en-GB'),
            /* eslint-enable @typescript-eslint/naming-convention */
          },
        },
      ],
    };
  }

  private polygonPartsToSensors(layerPolygonParts?: FeatureCollection): string[] {
    if (!layerPolygonParts) {
      return [];
    }
    const sensors = new Set<string>();
    layerPolygonParts.features.forEach((feature) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const partSensors = (feature.properties as { SensorType: string }).SensorType.split(',');
      partSensors.forEach((sensor) => {
        if (!sensors.has(sensor)) {
          sensors.add(sensor);
        }
      });
    });
    return Array.from(sensors);
  }

  private mergeClassification(oldClassification?: string, newClassification?: string): string {
    //note this requires numeric classification system.
    const DEFAULT_CLASSIFICATION = '3';
    if (oldClassification != undefined && newClassification != undefined) {
      return Math.min(parseInt(oldClassification), parseInt(newClassification)).toString();
    } else if (oldClassification != undefined) {
      return oldClassification;
    } else if (newClassification != undefined) {
      return newClassification;
    } else {
      return DEFAULT_CLASSIFICATION;
    }
  }
}
