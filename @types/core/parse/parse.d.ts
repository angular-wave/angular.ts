export function constantWatchDelegate(
  scope: any,
  listener: any,
  objectEquality: any,
  parsedExpression: any,
): any;
export class ParseProvider {
  /**
   * Allows defining the set of characters that are allowed in AngularTS expressions. The function
   * `identifierStart` will get called to know if a given character is a valid character to be the
   * first character for an identifier. The function `identifierContinue` will get called to know if
   * a given character is a valid character to be a follow-up identifier character. The functions
   * `identifierStart` and `identifierContinue` will receive as arguments the single character to be
   * identifier and the character code point. These arguments will be `string` and `numeric`. Keep in
   * mind that the `string` parameter can be two characters long depending on the character
   * representation. It is expected for the function to return `true` or `false`, whether that
   * character is allowed or not.
   *
   * Since this function will be called extensively, keep the implementation of these functions fast,
   * as the performance of these functions have a direct impact on the expressions parsing speed.
   *
   * @param {function(any):boolean} [identifierStart] The function that will decide whether the given character is
   *   a valid identifier start character.
   * @param {function(any):boolean} [identifierContinue] The function that will decide whether the given character is
   *   a valid identifier continue character.
   * @returns {ParseProvider}
   */
  setIdentifierFns: (
    identifierStart?: (arg0: any) => boolean,
    identifierContinue?: (arg0: any) => boolean,
  ) => ParseProvider;
  $get: (string | (($filter: (any: any) => any) => any))[];
}
