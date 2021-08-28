import assert from "assert";

import type { DefinitionProp } from "../../commands/definitionToTable";
import { toMarkdownTable } from "../../lib/toMarkdownTable";

suite("Markdown", () => {
  test("should properly export a definition with no props", () => {
    const name = "Test";
    const docs = "Test doc";

    assert.strictEqual(
      toMarkdownTable({
        name,
        docs,
        props: [],
      }),
      getHeader(name, docs)
    );
  });

  test("should properly export a definition with multiple props", () => {
    const name = "Test";
    const { prop: prop1, md: md1 } = getProp(1);
    const { prop: prop2, md: md2 } = getProp(2);
    const { prop: prop3, md: md3 } = getProp(3, true);
    const { prop: prop4, md: md4 } = getProp(4, false, "custom docs");
    const { prop: prop5, md: md5 } = getProp(5, true, "custom docs", "hello");

    assert.strictEqual(
      toMarkdownTable({
        name,
        docs: "",
        props: [prop1, prop2, prop3, prop4, prop5],
      }),
      `${getHeader(name)}${md1}${md2}${md3}${md4}${md5}`
    );
  });
});

function getHeader(title: string, docs = "") {
  let header = `# ${title}
`;

  if (docs.length > 0) {
    header = header.concat(`\n${docs}\n`);
  }

  header = header.concat(
    "\n| name | type | optional | default | description |\n| - | - | - | - | - |\n"
  );

  return header;
}

function getProp(
  index: number,
  optional = false,
  doc = "docs",
  defaultValue?: string
): { prop: DefinitionProp; md: string } {
  const name = `name-${index}`;
  const type = `type-${index}`;
  const docs = `${doc}-${index}`;

  return {
    prop: {
      name,
      type,
      docs,
      optional,
      defaultValue,
    },
    md: `| ${name} | \`${type}\` | \`${optional}\` | ${
      defaultValue ?? "n/a"
    } | ${docs} |\n`,
  };
}
