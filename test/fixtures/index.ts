import { C, D } from "./types";

type Id = number;

interface A {
  id: Id | boolean | string;
  name: string;
}

/**
 * Describe B...
 */
interface B extends A {
  desc?: string | string[];
  /**
   * Describe enabled in B
   */
  enabled?: boolean;
}

interface T {
  do(arg: string): void;
}

interface T2 {
  dodo: (arg: string) => void;
}

interface E {
  test1?: string;
  test2: number;
}

interface F extends Omit<E, "test1"> {
  test1?: number;
}

/**
 * Options de mon super plugin....
 */
interface Options extends C, D, T, T2, F {
  moreOptions: string[];
  prop1: string | undefined;
  prop2?: string;
}
