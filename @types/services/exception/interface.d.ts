/**
 * A callback type for handling errors.
 *
 * @param {Error} exception - The exception associated with the error.
 * @throws {Error}
 */
export type ExceptionHandler = (exception: Error) => never;
