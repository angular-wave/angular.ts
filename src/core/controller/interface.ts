export type ControllerService = (
  expression: string | Function | ng.AnnotatedFactory<any>,
  locals?: Record<string, any>,
  later?: boolean,
  ident?: string,
) => object | (() => object);
