import { getHFEmbedding } from './hfService.js';

// sentence-transformers/all-mpnet-base-v2 produces 768-dimensional vectors
export const EMBEDDING_DIMENSIONS = 768;

export async function getEmbedding(text) {
  try {
    const embedding = await getHFEmbedding(text);
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from Hugging Face');
    }
    return embedding;
  } catch (err) {
    console.error('Embedding service error:', err.message);
    throw err;
  }
}

export async function getEmbeddings(texts) {
  const vectors = [];
  for (const text of texts) {
    const vec = await getEmbedding(text);
    vectors.push(vec);
  }
  return vectors;
}
