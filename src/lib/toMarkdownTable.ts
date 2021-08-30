import { Definition } from "../commands/definitionToTable";

export function toMarkdownTable(defs: Definition): string {
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
      `\`${escapeMarkdownText(prop.type)}\``,
      `\`${prop.optional}\``,
      `\`${escapeMarkdownText(prop.defaultValue ?? "n/a")}\``,
      escapeMarkdownText(prop.docs),
    ];
    markdownText += `| ${values.join(" | ")} |\n`;
  });

  return markdownText;
}

export function escapeMarkdownText(text: string): string {
  return text.replace(/\|/g, "\\|");
}
