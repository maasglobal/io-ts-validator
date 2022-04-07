import { ValidatorErrorArray, validatorErrorArray } from '../errors';

describe('validatorErrorArray constructor function', () => {
  it('should construct ValidatorErrorArray', () => {
    const firstError = 'oh noes';
    const anotherError = 'problem';
    const allErrors = [firstError, anotherError];
    const e: ValidatorErrorArray = validatorErrorArray(allErrors);
    expect(e).toBeInstanceOf(ValidatorErrorArray);
    expect(e.name).toEqual('ValidatorErrorArray');
    expect(e.message).toEqual(firstError);
    expect(Array.isArray(e)).toEqual(true);
    expect(Array(...e)).toEqual(allErrors);
  });
});
