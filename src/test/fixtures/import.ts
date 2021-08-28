import type { ExportedTest1, ExportedTest2 } from "./definitions";

type Test1 = { a: string } & ExportedTest1;

interface Test2 extends ExportedTest2 {
  a: number;
}
