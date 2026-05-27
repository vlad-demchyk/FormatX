import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";

export interface DocumentConverter {
  /** Whether this converter can handle this specific conversion */
  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean;

  /** Perform conversion — returns blob, mime, filename */
  convert(request: ConversionRequest): Promise<ConversionResult>;

  /** Human-readable name for error messages */
  readonly name: string;
}
