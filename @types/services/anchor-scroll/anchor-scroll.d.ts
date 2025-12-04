/**
 * @typedef {Object} AnchorScrollObject
 * @property {number|function|Element} yOffset
 */
/**
 * @typedef {(string) => void} AnchorScrollFunction
 */
/**
 * @typedef {AnchorScrollFunction | AnchorScrollObject} AnchorScrollService
 */
export class AnchorScrollProvider {
  autoScrollingEnabled: boolean;
  $get: (
    | string
    | ((
        $location: import("../../services/location/location.js").Location,
        $rootScope: ng.Scope,
      ) => AnchorScrollFunction)
  )[];
}
export type AnchorScrollObject = {
  yOffset: number | Function | Element;
};
export type AnchorScrollFunction = (string: any) => void;
export type AnchorScrollService = AnchorScrollFunction | AnchorScrollObject;
