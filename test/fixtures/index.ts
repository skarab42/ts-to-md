type Id = string;

interface A {
  id: Id;
  name: string;
}

/**
 * Describe B...
 */
interface B extends A {
  desc?: string;
  /**
   * Describe enabled in B
   */
  enabled?: boolean;
}
