import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, default: 'application/pdf' },
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
  chunkCount: { type: Number, default: 0 },
  status: { type: String, enum: ['processing', 'indexed', 'failed'], default: 'processing' },
});

export default mongoose.model('Document', documentSchema);
