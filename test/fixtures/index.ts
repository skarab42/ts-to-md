import { C, D } from "./types";

/** Prop... */
type Id = number;

type Prout = {
  name: string;
  power: number;
};

interface Prout2 {}

/** Yhouououou */
type Roger = A & { plop: boolean };

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

interface BB extends B {
  plop: string;
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
  // plop
  moreOptions: string[];
  /* prout */
  prop1: string | undefined;
  /**
   * kapoueeee
   * @default "pouet"
   */
  prop2?: string;
}

interface KeyPair<T, U> {
  key: T;
  value: U;
}

// Une interface qui décrit qu'on a toujours les propriétés a, b & c et peut être d'autre propriété.
// L'output ne contient pas l'index signature
interface Plop45 {
  a: boolean;
  b: boolean;
  c: boolean;
  /** Prout... */
  [key: string]: boolean; // <--- index signature
}

// Une interface équivalent à un Record<string, boolean>
// L'output est vide et ne contient pas l'index signature
interface Plop46 {
  [key: string]: boolean | KeyPair<string, string>;
}

interface Plop47 {
  [key: number]: boolean | KeyPair<string, string>;
}

interface Plop48 {
  a: boolean;
  b: boolean;
  c: boolean;
}

type Thingy<K extends keyof Plop48> = {
  [key in K]: number;
} & { plop: string };

type L = Thingy<keyof Plop48>;
