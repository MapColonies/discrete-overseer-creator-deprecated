import _ from 'lodash';
import { LayerMetadata } from '@map-colonies/mc-model-types';


export const filterLayerMetadata = (originalRequestMetadata: unknown): LayerMetadata => {
    const layerMetadataKeys = _.keys(new LayerMetadata);
    const filteredMetadata: LayerMetadata = _.cloneDeepWith(_.pick(originalRequestMetadata, layerMetadataKeys)) as LayerMetadata;
    return filteredMetadata;
}


