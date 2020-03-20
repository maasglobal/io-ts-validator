import { validator } from '../validator';

describe('io-ts-validator', () => {
  it('should provide a validator', () => {
    expect(typeof validator).toEqual('function');
  });
});
