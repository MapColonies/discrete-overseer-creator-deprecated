import { FileValidator } from '../../src/layers/models/fileValidator';

const fileValidatorValidateExistsMock = jest.fn();
const validateGpkgFilesMock = jest.fn();

const fileValidatorMock = {
  validateExists: fileValidatorValidateExistsMock,
  validateGpkgFiles: validateGpkgFilesMock
} as unknown as FileValidator;

export { fileValidatorValidateExistsMock, validateGpkgFilesMock, fileValidatorMock };
