type Id = string;

interface C {
  id: Id;
  name: string;
}

interface A {
  id: Id;
  c: C;
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

interface A {
  moreOptions: string[];
}
