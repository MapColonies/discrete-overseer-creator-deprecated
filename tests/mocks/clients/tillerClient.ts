import { TillerClient } from '../../../src/serviceClients/tillerClient';

const addTilingRequestMock = jest.fn();
const tillerClientMock = ({
  addTilingRequest: addTilingRequestMock,
} as unknown) as TillerClient;

export { addTilingRequestMock, tillerClientMock };
