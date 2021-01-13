import { StorageClient } from '../../src/serviceClients/storageClient';
import { TillerClient } from '../../src/serviceClients/tillerClient';

//storage client mock
const saveMetadataMock = jest.fn();
const getCompletedZoomLevelsMock = jest.fn();
const publishToCatalogMock = jest.fn();
const dbMock = ({
  saveMetadata: saveMetadataMock,
  getCompletedZoomLevels: getCompletedZoomLevelsMock,
  publishToCatalog: publishToCatalogMock,
} as unknown) as StorageClient;
const storage = {
  saveMetadataMock: saveMetadataMock,
  getCompletedZoomLevelsMock: getCompletedZoomLevelsMock,
  publishToCatalogMock: publishToCatalogMock,
  clientMock: dbMock,
};

//tiller client mock
const addTilingRequestMock = jest.fn();
const tillerMock = ({
  addTilingRequest: addTilingRequestMock,
} as unknown) as TillerClient;
const tiller = {
  addTilingRequestMock: addTilingRequestMock,
  clientMock: tillerMock,
};

export { tiller, storage };
