import { FileValidator } from '../../src/layers/models/fileValidator';

const fileValidatorValidateExistsMock = jest.fn();
const validateGpkgFilesMock = jest.fn();
const validateTiffsFilesMock = jest.fn();

const fileValidatorMock = {
  validateExists: fileValidatorValidateExistsMock,
  validateGpkgFiles: validateGpkgFilesMock,
  validateTiffsFiles: validateTiffsFilesMock,
} as unknown as FileValidator;

export { fileValidatorValidateExistsMock, validateGpkgFilesMock, validateTiffsFilesMock, fileValidatorMock };
