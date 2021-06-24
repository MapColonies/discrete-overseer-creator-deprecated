import { LayerMetadata } from '@map-colonies/mc-model-types';

export enum TocOperation {
  ADD = 'ADD',
  UPDATE = 'UPDATE',
  REMOVE = 'REMOVE',
}

export enum TocSourceType {
  DISCRETE = 'DISCRETE',
  BSETMOSAIC = 'BSETMOSAIC',
}

export enum SchemaType {
  JSON = 'application/json',
  XML = 'application/xml',
}

export interface ITocParams {
  operation: TocOperation;
  sourceType: TocSourceType;
  productId: string;
  productVersion: string;
}

export interface ITocResponse {
  operation: TocOperation;
  sourceType: TocSourceType;
  metadata: LayerMetadata;
}
