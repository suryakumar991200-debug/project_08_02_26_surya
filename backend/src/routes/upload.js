import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import { parseAndChunkPdf } from '../services/pdfParser.js';
import { getEmbedding } from '../services/embeddings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname) || '.pdf');
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

const router = express.Router();

// Handle multer errors (e.g. file too large, wrong type)
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const doc = new Document({
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    status: 'processing',
  });

  try {
    console.log(`📂 Received file: ${doc.originalName} (${doc.size} bytes)`);
    await doc.save();

    console.log(`📄 Reading PDF buffer...`);
    const buffer = fs.readFileSync(req.file.path);

    console.log(`📄 Parsing and chunking PDF...`);
    const { chunks } = await parseAndChunkPdf(buffer);

    console.log(`📄 Processing ${chunks.length} chunks for ${doc.originalName}...`);
    for (const [idx, { content, pageNumber, chunkIndex }] of chunks.entries()) {
      if (idx % 5 === 0) console.log(`   > Processing chunk ${idx + 1}/${chunks.length}...`);
      const embedding = await getEmbedding(content);
      await DocumentChunk.create({
        documentId: doc._id,
        filename: doc.originalName,
        chunkIndex,
        pageNumber,
        content,
        embedding,
      });
    }
    console.log(`✅ Ingestion complete for ${doc.originalName}`);

    doc.chunkCount = chunks.length;
    doc.status = 'indexed';
    await doc.save();

    fs.unlink(req.file.path, () => { });

    res.status(201).json({
      id: doc._id,
      originalName: doc.originalName,
      chunkCount: doc.chunkCount,
      status: doc.status,
    });
  } catch (err) {
    console.error(`❌ Ingestion failed for ${doc.originalName}:`, err);
    try {
      doc.status = 'failed';
      await doc.save();
    } catch (_) { }
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message || 'Ingestion failed' });
  }
});

router.get('/documents', async (req, res) => {
  try {
    const list = await Document.find().sort({ uploadedAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await DocumentChunk.deleteMany({ documentId: id });
    const deletedDoc = await Document.findByIdAndDelete(id);
    if (!deletedDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ message: 'Document and associated chunks deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
