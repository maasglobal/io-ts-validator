

import sys; sys.stdout.write(('/*' + '\n' + '/*'.join(
  '*/'.join(sys.stdin.read().split('```typescript')).split('```')
) + '*/').replace("from 'io-ts-validator'", "from './validator'") + '\n' + 'export { Person, decodeSyncExample, decodePromiseExample, decodeEitherExample, decodeEitherToolingExample, decodeAsyncExample, decoded, ramJoe, possiblyInvalid, knownToBeValid, notPerson, notAdult }')
