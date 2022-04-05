/* eslint-disable fp/no-class,fp/no-this,fp/no-mutation */

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface ValidatorErrorArray extends Array<string>, Error {}

export class ValidatorErrorArray extends Array<string> implements ValidatorErrorArray {
  public name: string;
  public message: string;

  constructor(errors: Array<string>) {
    super(...errors);
    Object.setPrototypeOf(this, ValidatorErrorArray.prototype);
    this.name = this.constructor.name;
    const [firstError] = errors;
    this.message = String(firstError);
  }
}
export function validatorErrorArray(errors: Array<string>): ValidatorErrorArray {
  return new ValidatorErrorArray(errors);
}
