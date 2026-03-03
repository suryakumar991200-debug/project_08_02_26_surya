import mongoose from 'mongoose';
import { getEmbedding } from './embeddings.js';
import DocumentChunk from '../models/DocumentChunk.js';

const NUM_RESULTS = 3;

/**
 * Run vector search using MongoDB Atlas $vectorSearch (Atlas 6.0+).
 * Falls back to simple cosine similarity in-memory if no vector index.
 */
export async function searchChunks(query, limit = NUM_RESULTS) {
  const queryEmbedding = await getEmbedding(query);

  try {
    const collection = mongoose.connection.collection('documentchunks');
    const cursor = collection.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit,
        },
      },
      {
        $project: {
          content: 1,
          filename: 1,
          pageNumber: 1,
          chunkIndex: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);
    const results = await cursor.toArray();

    // If Atlas search returns no results, try the in-memory fallback
    if (results.length === 0) {
      console.log('⚠️ Atlas vector search returned 0 results. Triggering in-memory fallback...');
      return fallbackSimilaritySearch(queryEmbedding, limit);
    }
    else{
      console.log('✅ Atlas vector search returned results.');
    }

    return results.map((r) => ({
      content: r.content,
      source: r.filename,
      pageNumber: r.pageNumber,
      score: r.score,
    }));
  } catch (err) {
    // Use in-memory fallback when Atlas vector index is missing or any aggregation error
    const useFallback =
      err.message?.includes('vectorSearch') ||
      err.code === 267 ||
      err.code === 2 ||
      err.code === 292 ||
      err.name === 'MongoServerError' ||
      (err.message && (err.message.includes('index') || err.message.includes('vector')));
    if (useFallback) {
      return fallbackSimilaritySearch(queryEmbedding, limit);
    }
    throw err;
  }
}

async function fallbackSimilaritySearch(queryEmbedding, limit) {
  const chunks = await DocumentChunk.find({}).lean();
  if (chunks.length === 0) return [];

  const scored = chunks.map((chunk) => {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    return { ...chunk, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ content, filename, pageNumber }) => ({
    content,
    source: filename,
    pageNumber,
    score: undefined,
  }));
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
