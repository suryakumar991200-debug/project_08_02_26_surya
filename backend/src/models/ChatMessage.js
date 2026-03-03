import mongoose from 'mongoose';

const citationSchema = new mongoose.Schema({
  source: { type: String, required: true },
  pageNumber: { type: Number },
  excerpt: { type: String },
});

const chatMessageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
   role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  citations: [citationSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('ChatMessage', chatMessageSchema);
