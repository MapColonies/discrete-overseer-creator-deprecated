import { MergeTasker } from '../../src/merge/mergeTasker';

const createMergeTaskMock = jest.fn();

const mergeTaskerMock = {
  createMergeTask: createMergeTaskMock,
} as unknown as MergeTasker;

export { mergeTaskerMock, createMergeTaskMock };
