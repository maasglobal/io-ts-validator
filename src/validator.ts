import { Either } from 'fp-ts/lib/Either';
import * as Either_ from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import { Json } from 'fp-ts/lib/Json';
import * as Json_ from 'fp-ts/lib/Json';
import { Reader } from 'fp-ts/lib/Reader';
import * as t from 'io-ts';
import * as PathReporter_ from 'io-ts/lib/PathReporter';

import {
  ValidatorErrorArray as Errors,
  validatorErrorArray as errorArray,
} from './errors';

export * from './errors';

export type Callback<E, D> = (...x: [E] | [null, D]) => void;
export type PromiseLibrary = typeof Promise;

export type ErrorMap<E> = (e: Array<t.ValidationError>) => E;

export type Parser<O, SO, I, SI> = {
  readonly serialize: (r: O) => SO;
  readonly deserialize: (s: SI) => I;
};
export type Codec<A, O, I> = t.Type<A, O, I>;

export type Settings<E, O, SO, I, SI> = {
  readonly mapError: ErrorMap<E>;
  readonly parser: Parser<O, SO, I, SI>;
  readonly Promise: PromiseLibrary;
};

export type DecodeSync<_E, I, A> = (i: I) => A; // throws _E
export type EncodeSync<_E, A, O> = (i: A) => O; // throws _E

export type DecodeAsync<E, I, A> = (i: I, cb: Callback<E, A>) => void;
export type EncodeAsync<E, A, O> = (a: A, cb: Callback<E, O>) => void;

export type DecodePromise<_E, I, A> = (i: I) => Promise<A>; // rejects with E
export type EncodePromise<_E, A, O> = (a: A) => Promise<O>; // rejects with E

export type DecodeEither<E, I, A> = (i: I) => Either<E, A>;
export type EncodeEither<E, A, O> = (a: A) => Either<E, O>;

export type Check<A> = (u: unknown) => u is A;
export type Assert<A> = <I extends A>(i: I) => I;

export type _Validator<E, A, O, SO, I, SI> = {
  readonly _codec: Codec<A, O, I>;
  readonly _settings: Settings<E, O, SO, I, SI>;

  readonly decodeSync: DecodeSync<E, SI, A>;
  readonly encodeSync: EncodeSync<E, A, SO>;
  readonly decodeAsync: DecodeAsync<E, SI, A>;
  readonly encodeAsync: EncodeAsync<E, A, SO>;
  readonly decodePromise: DecodePromise<E, SI, A>;
  readonly encodePromise: EncodePromise<E, A, SO>;
  readonly decodeEither: DecodeEither<E, SI, A>;
  readonly encodeEither: EncodeEither<E, A, SO>;
  readonly check: Check<A>;
  readonly assert: Assert<A>;
};

/* eslint-disable */

export class Validator<E, A, O = A, SO = O, I = unknown, SI = I>
  implements _Validator<E, A, O, SO, I, SI>
{
  readonly _codec: Codec<A, O, I>;
  readonly _settings: Settings<E, O, SO, I, SI>;

  constructor(codec: Codec<A, O, I>, settings: Settings<E, O, SO, I, SI>) {
    this._codec = codec;
    this._settings = settings;
  }

  encodeEither = (a: A) => {
    return pipe(this._codec.encode(a), (o: O) =>
      Either_.tryCatch(
        () => this._settings.parser.serialize(o),
        (): E => this._settings.mapError([]),
      ),
    );
  };
  encodeSync = (a: A) => {
    return pipe(
      this.encodeEither(a),
      Either_.fold(
        (e) => {
          throw e;
        },
        (a) => a,
      ),
    );
  };
  encodeAsync = (a: A, cb: Callback<E, SO>) => {
    return pipe(
      this.encodeEither(a),
      Either_.fold(
        (e) => cb(e),
        (a) => cb(null, a),
      ),
    );
  };
  encodePromise = (a: A) => {
    return pipe(
      this.encodeEither(a),
      Either_.fold(
        (e) => this._settings.Promise.reject(e),
        (a) => this._settings.Promise.resolve(a),
      ),
    );
  };
  decodeEither = (si: SI) => {
    return pipe(
      this._settings.parser.deserialize(si),
      this._codec.decode,
      Either_.mapLeft(this._settings.mapError),
    );
  };
  decodeSync = (si: SI) => {
    return pipe(
      this.decodeEither(si),
      Either_.fold(
        (e) => {
          throw e;
        },
        (a) => a,
      ),
    );
  };
  decodeAsync = (si: SI, cb: Callback<E, A>) => {
    return pipe(
      this.decodeEither(si),
      Either_.fold(
        (e) => cb(e),
        (a) => cb(null, a),
      ),
    );
  };
  decodePromise = (si: SI) => {
    return pipe(
      this.decodeEither(si),
      Either_.fold(
        (e) => this._settings.Promise.reject(e),
        (a) => this._settings.Promise.resolve(a),
      ),
    );
  };

  check = (u: unknown): u is A => {
    return this._codec.is(u);
  };

  assert<X extends A>(x: X) {
    return x;
  }
}

const identity = <I>(i: I) => i;

export type Jsontext = string;

export type Preset = 'raw' | 'json' | 'strict';

export const raw = <A, O, I>(codec: Codec<A, O, I>): Settings<Errors, O, O, I, I> => ({
  Promise,
  mapError: (te) => errorArray(PathReporter_.failure(te)),
  parser: {
    serialize: identity,
    deserialize: identity,
  },
});

export const json = <A, O, I>(
  codec: Codec<A, O, I>,
): Settings<Errors, O, Jsontext, I, Jsontext> => ({
  Promise,
  mapError: (te) => errorArray(PathReporter_.failure(te)),
  parser: {
    serialize: (o: O): Jsontext =>
      pipe(
        Json_.stringify(o),
        Either_.fold(
          (error): Jsontext => {
            throw new Error('Failed to stringify as JSON');
          },
          (so: string): Jsontext => so,
        ),
      ),
    deserialize: (si: Jsontext): I =>
      pipe(
        Json_.parse(si),
        Either_.fold(
          (error): I => {
            throw new Error('Failed to parse as JSON');
          },
          (i: Json): I => i as unknown as I,
        ),
      ),
  },
});

export const strict = <A, O, I>(codec: Codec<A, O, I>): Settings<Errors, O, O, O, O> => ({
  Promise,
  mapError: (te) => errorArray(PathReporter_.failure(te)),
  parser: {
    serialize: identity,
    deserialize: identity,
  },
});

type Presets<O, I> = {
  raw: Settings<Errors, O, O, I, I>;
  json: Settings<Errors, O, Jsontext, I, Jsontext>;
  strict: Settings<Errors, O, O, O, O>;
};

const presets = <A, O, I, SO>(codec: Codec<A, O, I>): Presets<O, I> => ({
  raw: raw(codec),
  json: json(codec),
  strict: strict(codec),
});

type Select<O, I, P extends Preset> = Presets<O, I>[P];

const select =
  <A, O, I, P extends Preset>(p: P): Reader<Codec<A, O, I>, Select<O, I, P>> =>
  (codec) =>
    presets(codec)[p];

type Customizer<E, O, SO, I, SI> = (p: Presets<O, I>) => Settings<E, O, SO, I, SI>;

function fromSettings<E, A, O, SO, I, SI>(
  settings: Settings<E, O, SO, I, SI>,
): Reader<Codec<A, O, I>, Validator<E, A, O, SO, I, SI>> {
  return (codec: Codec<A, O, I>) => new Validator(codec, settings);
}
function fromCustomizer<E, A, O, SO, I, SI>(
  customizer: Customizer<E, O, SO, I, SI>,
): Reader<Codec<A, O, I>, Validator<E, A, O, SO, I, SI>> {
  return (codec: Codec<A, O, I>) => pipe(codec, fromSettings(customizer(presets(codec))));
}
function fromPresetRaw<A, O, I>(
  _preset: 'raw',
): Reader<Codec<A, O, I>, Validator<Errors, A, O, O, I, I>> {
  return (codec: Codec<A, O, I>) =>
    pipe(codec, fromSettings(select<A, O, I, 'raw'>('raw')(codec)));
}
function fromPresetJson<A, O, I>(
  _preset: 'json',
): Reader<Codec<A, O, I>, Validator<Errors, A, O, Jsontext, I, Jsontext>> {
  return (codec: Codec<A, O, I>) =>
    pipe(codec, fromSettings(select<A, O, I, 'json'>('json')(codec)));
}

export function validator<E, A, O, SO, I, SI>(
  codec: Codec<A, O, I>,
): Validator<Errors, A, O, O, I, I>;
export function validator<E, A, O, SO, I, SI>(
  codec: Codec<A, O, I>,
  settings: 'raw',
): Validator<Errors, A, O, SO, I, SI>;
export function validator<E, A, O, SO, I, SI>(
  codec: Codec<A, O, I>,
  settings: 'json',
): Validator<Errors, A, O, Jsontext, I, Jsontext>;
export function validator<E, A, O, SO, I, SI>(
  codec: Codec<A, O, I>,
  settings: 'strict',
): Validator<Errors, A, O, O, O, O>;
export function validator<E, A, O, SO, I, SI>(
  codec: Codec<A, O, I>,
  settings: Settings<E, O, SO, I, SI>,
): Validator<E, A, O, SO, I, SI>;
export function validator<E, A, O, SO, I, SI>(
  codec: Codec<A, O, I>,
  settings: Customizer<E, O, SO, I, SI>,
): Validator<E, A, O, SO, I, SI>;
export function validator<E, A, O, SO, I, SI>(
  codec: Codec<A, O, I>,
  settings?: Preset | Settings<E, O, SO, I, SI> | Customizer<E, O, SO, I, SI>,
) {
  if (typeof settings === 'object') {
    return pipe(codec, fromSettings(settings));
  }
  if (typeof settings === 'function') {
    return pipe(codec, fromCustomizer(settings));
  }
  if (settings === 'json') {
    return pipe(codec, fromPresetJson('json'));
  }
  return pipe(codec, fromPresetRaw('raw'));
}
