/**
 * A callback type for handling errors.
 *
 * @param {Error} exception - The exception associated with the error.
 */
export type ExceptionHandler = (exception: Error) => never;
