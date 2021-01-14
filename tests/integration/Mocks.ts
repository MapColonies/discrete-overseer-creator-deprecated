import { ILogger } from '../../src/common/interfaces';
import { PublisherClient } from '../../src/serviceClients/publisherClient';
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

//publisher client mock
const publishLayerMock = jest.fn();
const publisherMock = ({
  publishLayer: publishLayerMock,
} as unknown) as PublisherClient;
const publisher = {
  publishLayerMock: publishLayerMock,
  clientMock: publisherMock,
};

//logger mock
const logMock = jest.fn();
const loggerMocker = {
  log: logMock,
} as ILogger;
const logger = {
  logMock: logMock,
  logger: loggerMocker,
};

const resetMocks = (): void => {
  saveMetadataMock.mockReset();
  getCompletedZoomLevelsMock.mockReset();
  publishToCatalogMock.mockReset();
  addTilingRequestMock.mockReset();
  publishLayerMock.mockReset();
  logMock.mockReset();
};

export { tiller, storage, publisher, logger, resetMocks };
