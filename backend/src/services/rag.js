import { streamHFChat } from './hfService.js';
import { searchChunks } from './vectorSearch.js';

const SYSTEM_PROMPT = `You are OpsMind AI, a precise corporate knowledge assistant. You answer ONLY using the provided context from company documents. For every claim you make, you must cite the source document and page number when available.

Rules:
- If the answer cannot be found in the context, say exactly: "I don't know." Do not guess or make up information.
- When you do have an answer, cite the source (e.g., "According to [filename], page [number]...").
- Be concise and professional.`;

function buildContext(retrievedChunks) {
  return retrievedChunks
    .map((c, i) => `[Source: ${c.source}${c.pageNumber ? `, Page ${c.pageNumber}` : ''}]\n${c.content}`)
    .join('\n\n---\n\n');
}

export async function* streamRagResponse(userQuery, sessionId) {
  let retrieved = [];
  try {
    retrieved = await searchChunks(userQuery, 3);
  } catch (err) {
    console.error('[RAG] Vector search error:', err);
  }

  const context = buildContext(retrieved);
  const citations = retrieved.map((c) => ({
    source: c.source,
    pageNumber: c.pageNumber,
    excerpt: c.content.slice(0, 200) + (c.content.length > 200 ? '...' : ''),
  }));

  try {
    const prompt = `${SYSTEM_PROMPT}

Context from knowledge base:
${context}

User question: ${userQuery}

Answer (cite sources; if not in context, say "I don't know."):`;

    let fullText = '';
    for await (const token of streamHFChat(prompt)) {
      fullText += token;
      yield { type: 'token', data: token };
    }

    yield { type: 'citations', data: citations };
    yield { type: 'done' };
  } catch (err) {
    console.error('RAG Stream Error:', err.message);
    yield { type: 'error', data: err.message };
  }
}
