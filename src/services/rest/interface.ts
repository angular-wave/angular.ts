export interface RestDefinition<T = any> {
  name: string;
  url: string;
  /** Constructor for mapping JSON to class instance */
  entityClass?: EntityClass<T>;
  options?: Record<string, any>;
}

/**
 * A constructor type for mapping JSON objects to entity instances
 */
export interface EntityClass<T = any> {
  /**
   * Creates a new instance of the entity from a raw object
   * @param data - Raw data (typically JSON) to map
   */
  new (data: any): T;
}
