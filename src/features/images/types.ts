export type ImageStatus = "pending" | "converting" | "ready" | "error";

export interface QueueItem {
  id: string;
  file: File;
  thumbUrl: string | null;
  blobs: Blob[] | null;
  status: ImageStatus;
  error: string | null;
  selected: boolean;
  heicPreview: boolean;
}

export const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  webp: "image/webp",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};
