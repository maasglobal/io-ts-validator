import * as t from 'io-ts';
import { validator } from '../validator';

describe('io-ts-validator', () => {
  it('should provide a validator based on codec', () => {
    const valid = 123;
    const broken = 0.123;
    expect(validator(t.Int).decodeSync(valid)).toEqual(valid);
    expect(() => validator(t.Int).decodeSync(broken)).toThrowError();
  });
  it('should provide raw preset with default settings', () => {
    const valid = 123;
    const broken = 0.123;
    expect(validator(t.Int, 'raw').decodeSync(valid)).toEqual(valid);
    expect(() => validator(t.Int, 'raw').decodeSync(broken)).toThrowError();
  });
  it('should provide json preset with integrator JSON parser', () => {
    const expected = [123];
    const valid = JSON.stringify(expected);
    const broken = valid.split('[').join('');
    expect(validator(t.array(t.number), 'json').decodeSync(valid)).toEqual(expected);
    expect(() => validator(t.array(t.number), 'json').decodeSync(broken)).toThrowError();
  });
  it('should let user define custom settings', () => {
    const valid = 123;
    const broken = 0.123;
    expect(
      validator(t.Int, {
        Promise,
        mapError: (x: Array<t.ValidationError>) => String(x),
        parser: {
          serialize: (x) => x,
          deserialize: (x) => x,
        },
      }).decodeSync(valid),
    ).toEqual(valid);
    expect(() =>
      validator(
        t.Int,

        {
          Promise,
          mapError: (x: Array<t.ValidationError>) => String(x),
          parser: {
            serialize: (x) => x,
            deserialize: (x) => x,
          },
        },
      ).decodeSync(broken),
    ).toThrowError();
  });
  it('should let user use a preset as a base for custom settings', () => {
    const expected = [123];
    const valid = JSON.stringify(expected);
    const broken = valid.split('[').join('');
    expect(
      validator(t.array(t.number), ({ raw }) => ({
        ...raw,
        parser: {
          serialize: (o: unknown) => JSON.stringify(o),
          deserialize: (s: string) => JSON.parse(s),
        },
      })).decodeSync(valid),
    ).toEqual(expected);
    expect(() =>
      validator(t.array(t.number), ({ raw }) => ({
        ...raw,
        parser: {
          serialize: (o: unknown) => JSON.stringify(o),
          deserialize: (s: string) => JSON.parse(s),
        },
      })).decodeSync(broken),
    ).toThrowError();
  });
});
