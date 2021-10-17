import { FileValidator } from '../../src/layers/models/fileValidator';

const fileValidatorValidateExistsMock = jest.fn();

const fileValidatorMock = {
  validateExists: fileValidatorValidateExistsMock,
} as unknown as FileValidator;

export { fileValidatorValidateExistsMock, fileValidatorMock };
