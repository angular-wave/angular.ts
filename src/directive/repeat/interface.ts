/**
 * $scope for ngRepeat directive.
 * see https://docs.angularjs.org/api/ng/directive/ngRepeat
 */
export interface RepeatScope extends ng.Scope {
  /**
   * iterator offset of the repeated element (0..length-1).
   */
  $index: number;

  /**
   * true if the repeated element is first in the iterator.
   */
  $first: boolean;

  /**
   * true if the repeated element is between the first and last in the iterator.
   */
  $middle: boolean;

  /**
   * true if the repeated element is last in the iterator.
   */
  $last: boolean;

  /**
   * true if the iterator position $index is even (otherwise false).
   */
  $even: boolean;

  /**
   * true if the iterator position $index is odd (otherwise false).
   */
  $odd: boolean;
}
