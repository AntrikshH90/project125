export function heuristicTableFromText(text: string): Array<Record<string, unknown>> {
  const tables: Array<Record<string, unknown>> = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  let buffer: string[] = [];
  let headerCols = 0;

  const flush = () => {
    if (buffer.length >= 2 && headerCols >= 2) {
      const header = splitRow(buffer[0]);
      const rows = buffer.slice(1).map((line) => {
        const cells = splitRow(line);
        const rec: Record<string, unknown> = {};
        header.forEach((h, i) => {
          if (h) rec[h] = cells[i] ?? null;
        });
        return rec;
      });
      tables.push({ table: rows.slice(0, 100) });
    }
    buffer = [];
    headerCols = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const isCandidate = /\s{2,}|\t| \| /.test(line) && line.split(/\s{2,}|\t| \| /).filter(Boolean).length >= 2;

    if (isCandidate) {
      const cols = line.split(/\s{2,}|\t| \| /).filter(Boolean).length;
      if (buffer.length === 0) {
        headerCols = cols;
        buffer.push(line);
      } else if (cols === headerCols) {
        buffer.push(line);
        if (buffer.length >= 50) flush();
      } else {
        flush();
        headerCols = cols;
        buffer.push(line);
      }
    } else {
      flush();
    }
  }
  flush();

  return tables.filter((t) => Array.isArray(t.table) && (t.table as unknown[]).length >= 2).slice(0, 20);
}

function splitRow(line: string): string[] {
  return line
    .split(/\s{2,}|\t|\s\|\s/)
    .map((c) => c.replace(/^þÿ/, "").trim())
    .filter((c) => c.length > 0);
}
