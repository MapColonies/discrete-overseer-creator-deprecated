import { LinkBuilder } from '../../src/tasks/models/linksBuilder';

const createLinksMock = jest.fn();

const linkBuilderMock = {
  createLinks: createLinksMock,
} as unknown as LinkBuilder;

export { createLinksMock, linkBuilderMock };
