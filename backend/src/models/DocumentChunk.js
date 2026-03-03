import mongoose from 'mongoose';

const documentChunkSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  filename: { type: String, required: true },
  chunkIndex: { type: Number, required: true },
  pageNumber: { type: Number },
  content: { type: String, required: true },
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: 'Embedding must be a non-empty array',
    },
  },
}, { timestamps: true });

// Vector search index must be created in Atlas (see README)
// Index: { "embedding": "vectorSearch", dimensions: 768, similarity: "cosine" }
documentChunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });

export default mongoose.model('DocumentChunk', documentChunkSchema);
