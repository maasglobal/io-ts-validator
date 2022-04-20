# io-ts-validator

Io-ts-validator is a wrapper that provides convenience features for [io-ts](https://github.com/gcanti/io-ts) codecs.
The codecs themself are described in greater detail in the [io-ts guide](https://github.com/gcanti/io-ts/blob/master/index.md).
If you have existing JSON Schema definitions for your types you can use
[io-ts-from-json-schema](https://www.npmjs.com/package/io-ts-from-json-schema) to convert your schema into io-ts codecs.
If you have a custom schema format you can use [io-ts-codegen](https://github.com/gcanti/io-ts-codegen) to implement
a converter for your custom schema format.

## Defining Codecs

Below we define a simple example codec `Person` that we can use to define a person `{ name: string, age: number }`.
We can extract the static type from the codec and use the static type to validate our person literal.

```typescript
import * as t from 'io-ts';

const Person = t.type({
  name: t.string,
  age: t.number,
});
type Person = t.TypeOf<typeof Person>;

const joe: Person = {
  name: 'Joe',
  age: 45,
};
```

## Input Decoding

Sooner or later we will run into a situation where we encounter a person with an unknown type.
Perhaps we received that person over the network or read the information from a loosely typed database.
The io-ts-validator package provides several variants of the decode method. _The decoding process
itself is always synchronous regardless of which decode method is used._

Below we simulate this by turning Joe into a person candidate with unknown type.
We two procedures `logPerson` and `logErrors` that expect typed inputs.
We can then use the various decode methods from the validator to turn the candidate back into a typed value.

```typescript
import { validator, ValidatorErrorArray } from 'io-ts-validator';

function logErrors(errors: ValidatorErrorArray): void {
  console.error(errors);
}

function logPerson(person: Person): void {
  console.log(person);
}

// this works
logPerson(joe);

const mary: unknown = {
  name: 'Mary',
  age: 13,
};

// @ts-expect-error candidate might not be a Person
logPerson(mary);
```

### decodeSync

The `decodeSync` method is the quickest and dirtiest way to do validation.
It is best suited for use with unit tests where a `throw` indicates test failure.
The main downside of the synchronous call is that it makes validation errors
indistinguishable of unexpected errors.

```typescript
function decodeSyncExample(candidate: unknown): void {
  try {
    const person: Person = validator(Person).decodeSync(candidate);
    logPerson(person);
  } catch (error) {
    if (error instanceof ValidatorErrorArray) {
      logErrors(error);
    }
    throw error; // unrelated error
  }
}
```

### decodePromise

The `decodePromise` method uses promise rejection instead of throw for returning
the error which may be desireable when validation happens in a context that already
makes heavy use of promise based error handling.

```typescript
async function decodePromiseExample(candidate: unknown): Promise<void> {
  try {
    const person: Person = await validator(Person).decodePromise(candidate);
    logPerson(person);
  } catch (error) {
    if (error instanceof ValidatorErrorArray) {
      logErrors(error);
    }
    throw error; // unrelated error
  }
}
```

### decodeEither

The `decodeEither` method returns either validation errors or a decoded value.
Returning the errors as opposed to throwing them has the benefit that we can
guarantee the type of the returned error.

```typescript
function decodeEitherExample(candidate: unknown): void {
  const result = validator(Person).decodeEither(candidate);

  if (result._tag === 'Left') {
    logErrors(result.left);
  } else {
    logPerson(result.right);
  }
}
```

The return value is compatible with generic utilities from the fp-ts
[Either](https://gcanti.github.io/fp-ts/modules/Either.ts.html) module.

```typescript
import { pipe } from 'fp-ts/function';
import { fold } from 'fp-ts/Either';

function decodeEitherToolingExample(candidate: unknown): number | null {
  return pipe(
    validator(Person).decodeEither(candidate),
    fold(
      () => null,
      ({ age }) => age,
    ),
  );
}
```

### decodeAsync

The `decodeAsync` method lets the user define a [NodeJS style](https://nodejs.org/en/knowledge/errors/what-are-the-error-conventions/) asynchronous callback for dealing with the result.

```typescript
function decodeAsyncExample(candidate: unknown): void {
  validator(Person).decodeAsync(candidate, (errors, person?) => {
    if (errors) {
      logErrors(errors);
    } else {
      logPerson(person);
    }
  });
}
```

## Output Encoding

Some codecs define a separate input type. For example codec `NumberFromString` is useful
for numeric URL parameters that need to be encoded as string when they part of the URL.
The validator also provides encode methods for such cases. In general it is a good practice
to encode all outputs to make sure they match the codec that would be used to validate them.

```typescript
import { NumberFromString } from 'io-ts-types/lib/NumberFromString';

const encoded: string = validator(NumberFromString).encodeSync(123);
const decoded: number = validator(NumberFromString).decodeSync(encoded);
```

## Json Integration

The validator has a preset configuration that you can use to
perform json serialization and deserialization on the fly
while performing validation.

```typescript
const wireJoe = validator(Person, 'json').encodeSync(joe);
const ramJoe = validator(Person, 'json').decodeSync(wireJoe);
```

## Runtime Validation

TypeScript static type system has some limitations which makes
it difficult to validate specific properties of strings and
numbers. The io-ts codecs provide runtime validation with branding.
Brands are inspection stamps that can be used by the validator to indicate that the
item has passed validation. In the example below we define a codec that change
the age of the person and brands them as adults if they pass validation.

```typescript
interface AdultBrand {
  readonly Adult: unique symbol;
}
const Adult = t.brand(
  Person,
  (p: Person): p is t.Branded<Person, AdultBrand> => p.age >= 18,
  'Adult',
);
type Adult = t.TypeOf<typeof Adult>;

// @ts-expect-error bob *might* not yet be 18
const possiblyInvalid: Adult = {
  name: 'Bob',
  age: 22,
};

// this is ok
const knownToBeValid: Adult = validator(Adult).decodeSync({
  name: 'Bob',
  age: 22,
});
```

## Strict Validator Inputs

The validator has a strict mode that requires validator inputs to match validator outputs.
Using it makes sense in some cases. For example in some cases the adult validator might
benefit from restricting acceptable inputs to type `Person`.

```typescript
// @ts-expect-error validator input needs to be a person
const notPerson: Adult = validator(Adult, 'strict').decodeSync('bar');

// this is ok but throws at runtime because `age` < 18
const notAdult: Adult = validator(Adult, 'strict').decodeSync({
  name: 'Bob',
  age: 17,
});
```
