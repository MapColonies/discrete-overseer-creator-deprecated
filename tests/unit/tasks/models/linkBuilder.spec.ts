import { ILinkBuilderData, LinkBuilder } from '../../../../src/tasks/models/linksBuilder';
import { getMock as configGetMock, configMock } from '../../../mocks/config';
import { logger } from '../../../mocks/logger';

let linkBuilder: LinkBuilder;
// eslint-disable-next-line no-var
var readFileSyncMock: jest.Mock;
jest.mock('fs', () => {
  readFileSyncMock = jest.fn();
  return {
    readFileSync: readFileSyncMock,
  };
});

describe('LinkBuilder', () => {
  beforeEach(function () {
    jest.resetAllMocks();
  });

  describe('createLinks', () => {
    it('do nothing if some tasks are not done', function () {
      const linksTemplate = `[{
            "name": "",
            "description": "",
            "protocol": "WMTS",
            "url": "{{serverUrl}}/wmts/1.0.0/WMTSCapabilities.xml"
          },
          {
            "name": "a",
            "description": "{{layerName}}",
            "protocol": "WMTS_tile",
            "url": "{{serverUrl}}/wmts/{{layerName}}/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png"
          }]`;
      const testData: ILinkBuilderData = {
        layerName: 'testLayer',
        serverUrl: 'https://testUrl',
      };
      configGetMock.mockReturnValue('config/linkTemplates.template');
      readFileSyncMock.mockReturnValue(linksTemplate);

      linkBuilder = new LinkBuilder(logger, configMock);

      const res = linkBuilder.createLinks(testData);

      const expectedLink = [
        {
          name: '',
          description: '',
          protocol: 'WMTS',
          url: 'https://testUrl/wmts/1.0.0/WMTSCapabilities.xml',
        },
        {
          name: 'a',
          description: 'testLayer',
          protocol: 'WMTS_tile',
          url: 'https://testUrl/wmts/testLayer/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.png',
        },
      ];

      expect(res).toEqual(expectedLink);
    });
  });
});
