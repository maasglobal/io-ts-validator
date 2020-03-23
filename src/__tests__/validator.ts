import * as t from 'io-ts';
import { validator } from '../validator';

describe('io-ts-validator', () => {
  it('should provide a validator', () => {
    const valid = 123;
    const broken = 0.123;
    expect(validator(t.Int).decodeSync(valid)).toEqual(valid);
    expect(() => validator(t.Int).decodeSync(broken)).toThrowError();
  });
  it('should do json serialization', () => {
    const expected = [123];
    const valid = JSON.stringify(expected);
    const broken = valid.split('[').join('');
    expect(validator(t.array(t.number), 'json').decodeSync(valid)).toEqual(expected);
    expect(() => validator(t.array(t.number), 'json').decodeSync(broken)).toThrowError();
  });
});
