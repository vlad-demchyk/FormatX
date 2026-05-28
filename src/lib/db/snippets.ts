import { db, type SnippetRow } from "./dexie";

const MAX_SNIPPETS = 30;

export interface TextSnippet {
  id: string;
  inputPreview: string;
  outputText: string;
  createdAt: number;
}

export async function addTextSnippet(input: string, output: string): Promise<void> {
  const id = crypto.randomUUID();
  const row: SnippetRow = {
    id,
    input_preview: input.slice(0, 80),
    output_text: output,
    created_at: Date.now(),
  };
  await db.textSnippets.put(row);

  // Trim oldest if over limit
  const count = await db.textSnippets.count();
  if (count > MAX_SNIPPETS) {
    const oldest = await db.textSnippets
      .orderBy("created_at")
      .limit(count - MAX_SNIPPETS)
      .primaryKeys();
    await db.textSnippets.bulkDelete(oldest);
  }
}

export async function listTextSnippets(): Promise<TextSnippet[]> {
  const rows = await db.textSnippets
    .orderBy("created_at")
    .reverse()
    .limit(10)
    .toArray();
  return rows.map((r) => ({
    id: r.id,
    inputPreview: r.input_preview,
    outputText: r.output_text,
    createdAt: r.created_at,
  }));
}
