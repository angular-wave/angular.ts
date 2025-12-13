/**
 * A callback type for handling errors.
 *
 * @param {unknown} exception - The exception associated with the error.
 * @throws {unknown}
 */
export type ExceptionHandler = (exception: unknown) => never;
