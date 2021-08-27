import { InterfaceDef } from "../commands/typeToTable";

export function toMarkdownTable(defs: InterfaceDef): string {
  let markdownText = `# ${defs.name}\n\n`;

  if (defs.docs) {
    markdownText += `${defs.docs}\n\n`;
  }

  const labels = ["name", "type", "optional", "default", "description"];
  const spearators: string[] = Array(labels.length).fill("-", 0, labels.length);

  markdownText += `| ${labels.join(" | ")} |\n`;
  markdownText += `| ${spearators.join(" | ")} |\n`;

  defs.props.forEach((prop) => {
    const values = [
      prop.name,
      `\`${prop.type}\``,
      `\`${prop.optional}\``,
      prop.defaultValue ?? "n/a",
      prop.docs,
    ];
    markdownText += `| ${values.join(" | ")} |\n`;
  });

  return markdownText;
}
