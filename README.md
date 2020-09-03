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

export const Person = t.type({
  name: t.string,
  age: t.number,
})
export type Person = t.Typeof<typeof Person>

const joe: Person = {
  name: 'Joe',
  age: 45,
}
```

## Input Decoding

Sooner or later we will run into a situation where we encounter a person with an unknown type.
Perhaps we received that person over the network or read the information from a loosely typed database.
Below we simulate this by turning Joe into a person candidate with unknown type.
We can use the various decode methods from the codec.

```typescript
import { validator } from 'io-ts-validator';

const candidate: unknown = joe

validator(Person).decodeSync(candidate);     // returns Person, throws on errors
validator(Person).decodePromise(candidate);  // returns Promise<Person>, rejects on errors
validator(Person).decodeEither(candidate);   // returns Either<Array<string>, Person>
validator(Person).decodeAsync(candidate, (errors, person) => { ... });  // returns void
```

## Output Encoding

Some codecs define a separate input type. For example codec `NumberFromString` is useful
for numeric URL parameters that need to be encoded as string when they part of the URL.
The validator also provides encode methods for such cases. In general it is a good practice
to encode all outputs to make sure they match the codec that would be used to validate them.

```typescript
import { NumberFromString } from 'io-ts-types/lib/NumberFromString';

const arg: string = validator(NumberFromString).encodeSync(123);
const x: number = validator(NumberFromString).decodeSync(arg);
```

## Json Integration

The validator has a preset configuration that you can use to
perform json serialization and deserialization on the fly
while performing validation.

```typescript
const wireJoe = validator(Person, 'json').encodeSync(joe);
const ramJoe = validator(Person, 'json').decodeSync(wireJoe);
```

##  Runtime Validation

TypeScript static type system has some limitations which makes
it difficult to validate specific properties of strings and
numbers. The io-ts codecs provide runtime validation with branding.
Brands are inspection stamps that can be used by the validator to indicate that the
item has passed validation. In the example below we define a codec that change
the age of the person and brands them as adults if they pass validation.


```typescript
export interface AdultBrand {
  readonly Adult: unique symbol
}
export const Adult = t.brand(
  Person,
  (p: Person): p is Adult => p.age >= 18,
  'Adult',
);
export type Adult = t.Typeof<typeof Adult>

// @ts-expect-error bob *might* not yet be 18
const noBob: Adult = {
  name: 'Bob',
  age: 22,
}

// this is ok
const adultBob: Adult = validator(Adult).decodeSync({
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
const neverBob: Adult = validator(Adult, 'strict').decodeSync('bar');

// this is ok but throws at runtime because `age` < 18
const underBob: Adult = validator(Adult, 'strict').decodeSync({
  name: 'Bob',
  age: 17,
});
```
