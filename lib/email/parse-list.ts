/** Split a freeform address list (comma/semicolon/whitespace) into unique lowercased emails. */
export function parseEmailList(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function serializeEmailList(emails: string[]): string {
  return emails.join(", ");
}
