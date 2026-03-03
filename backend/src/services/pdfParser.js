import pdfParse from 'pdf-parse';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * Parse PDF buffer to text and split into overlapping chunks (1000 chars, 200 overlap).
 * Returns array of { content, pageNumber }.
 */
export async function parseAndChunkPdf(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text;
  const numPages = data.numpages || 1;

  if (!text || !text.trim()) {
    throw new Error('PDF contains no extractable text');
  }

  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    let content = text.slice(start, end);

    
    // Try to break at sentence or paragraph boundary
    if (end < text.length) {
      const lastPeriod = content.lastIndexOf('.');
      const lastNewline = content.lastIndexOf('\n');
      const breakAt = Math.max(lastPeriod, lastNewline);
      if (breakAt > CHUNK_SIZE / 2) {
        content = content.slice(0, breakAt + 1);
        start += breakAt + 1;
      } else {
        start = end - CHUNK_OVERLAP;
      }
    } else {
      start = text.length;
    }

    const pageEstimate = numPages === 1 ? 1 : Math.max(1, Math.ceil((chunkIndex + 1) / Math.ceil(text.length / CHUNK_SIZE / numPages)));
    chunks.push({
      content: content.trim(),
      pageNumber: pageEstimate,
      chunkIndex: chunkIndex++,
    });
  }

  return { chunks, numPages };
}
