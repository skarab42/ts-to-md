import assert from "assert";

import type { DefinitionProp } from "../../commands/definitionToTable";
import { escapeMarkdownText, toMarkdownTable } from "../../lib/toMarkdownTable";

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
    const { prop: prop1, md: md1 } = getProp(0);
    const { prop: prop2, md: md2 } = getProp(1);
    const { prop: prop3, md: md3 } = getProp(2, { optional: true });
    const { prop: prop4, md: md4 } = getProp(3, {
      optional: false,
      docs: "custom docs",
    });
    const { prop: prop5, md: md5 } = getProp(5, {
      optional: true,
      docs: "custom docs",
      defaultValue: "hello",
    });

    assert.strictEqual(
      toMarkdownTable({
        name,
        docs: "",
        props: [prop1, prop2, prop3, prop4, prop5],
      }),
      `${getHeader(name)}${md1}${md2}${md3}${md4}${md5}`
    );
  });

  test("should escape pipes in the type, description & default value", () => {
    const name = "Test";
    const { prop: prop1, md: md1 } = getProp(0, {
      type: "string | string[]",
      docs: "a | b",
      defaultValue: "c | d",
    });

    assert.strictEqual(
      toMarkdownTable({
        name,
        docs: "",
        props: [prop1],
      }),
      `${getHeader(name)}${md1}`
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
  prop?: {
    optional?: boolean;
    docs?: string;
    defaultValue?: string;
    type?: string;
  }
): { prop: DefinitionProp; md: string } {
  const name = `name-${index}`;
  const type = `${prop?.type ?? "type"}-${index}`;
  const docs = `${prop?.docs ?? "docs"}-${index}`;
  const optional = prop?.optional ?? false;

  return {
    prop: {
      name,
      type,
      docs,
      optional,
      defaultValue: prop?.defaultValue,
    },
    md: `| ${name} | \`${escapeMarkdownText(
      type
    )}\` | \`${optional}\` | \`${escapeMarkdownText(
      prop?.defaultValue ?? "n/a"
    )}\` | ${escapeMarkdownText(docs)} |\n`,
  };
}
