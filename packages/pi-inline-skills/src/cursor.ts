export function textBeforeCursor(lines: readonly string[], cursorLine: number, cursorCol: number): string {
  const precedingLines = lines.slice(0, cursorLine);
  const currentLine = (lines[cursorLine] ?? "").slice(0, cursorCol);
  return [...precedingLines, currentLine].join("\n");
}
