import Dexie, { type Table } from "dexie";

/* ── Row types (stored in IndexedDB) ── */

export interface HistoryRow {
  id: string;
  type: "image" | "document";
  filename: string;
  mime: string;
  size: number;
  /** Raw file data — stored natively, no base64! */
  blobData: Blob | null;
  created_at: number;
  expires_at: number;
}

export interface SnippetRow {
  id: string;
  input_preview: string;
  output_text: string;
  created_at: number;
}

export interface AiChatRow {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  task?: string;
  tokens_used?: number;
  duration_ms?: number;
  created_at: number;
}

export interface AiPromptRow {
  id: string;
  task: "generate" | "summarize" | "translate";
  label: string;
  system_prompt: string;
  user_prompt: string;
  is_default: boolean;
  created_at: number;
}

export interface PinnedBlobRow {
  id: string;
  type: "image" | "document";
  label: string;
  mime: string;
  size: number;
  /** Raw file data stored natively */
  blobData: Blob | null;
  created_at: number;
}

/* ── Dexie database class ── */

export class FormatXDB extends Dexie {
  historyItems!: Table<HistoryRow, "id">;
  textSnippets!: Table<SnippetRow, "id">;
  aiChats!: Table<AiChatRow, "id">;
  aiPrompts!: Table<AiPromptRow, "id">;
  pinnedBlobs!: Table<PinnedBlobRow, "id">;

  constructor() {
    super("FormatX");
    this.version(1).stores({
      historyItems: "id, type, created_at, expires_at",
      textSnippets: "id, created_at",
      aiChats: "id, session_id, created_at",
      aiPrompts: "id, task, created_at",
      pinnedBlobs: "id, type, created_at",
    });
  }
}

/** Singleton DB instance */
export const db = new FormatXDB();
