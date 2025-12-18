import { extractText } from 'unpdf';

/**
 * Parse PDF file and extract text content
 */
export async function parsePDF(file: File): Promise<string> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Extract text using unpdf
    const { text } = await extractText(new Uint8Array(arrayBuffer), {
      mergePages: true,
    });

    if (!text || text.trim().length === 0) {
      throw new Error('PDF appears to be empty or text could not be extracted');
    }

    return cleanText(text);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
    throw new Error('Failed to parse PDF: Unknown error');
  }
}

/**
 * Parse text-based files (TXT, MD)
 */
export async function parseTextFile(file: File): Promise<string> {
  try {
    const text = await file.text();

    if (!text || text.trim().length === 0) {
      throw new Error('File appears to be empty');
    }

    return cleanText(text);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse file: ${error.message}`);
    }
    throw new Error('Failed to parse file: Unknown error');
  }
}

/**
 * Process pasted text
 */
export function parseDirectText(text: string): string {
  if (!text || text.trim().length === 0) {
    throw new Error('Text content is empty');
  }

  return cleanText(text);
}

/**
 * Clean and normalize text content
 * - Remove excessive whitespace
 * - Normalize line breaks
 * - Preserve structure (paragraphs, lists)
 */
function cleanText(text: string): string {
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (more than 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace from each line while preserving indentation
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    // Trim start and end
    .trim();
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Main parser function - routes to appropriate parser based on file type
 */
export async function parseFile(file: File): Promise<string> {
  const extension = getFileExtension(file.name);

  switch (extension) {
    case 'pdf':
      return parsePDF(file);
    case 'txt':
    case 'md':
      return parseTextFile(file);
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}
