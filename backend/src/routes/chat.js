import express from 'express';
import { streamRagResponse } from '../services/rag.js';
import ChatMessage from '../models/ChatMessage.js';
import { randomUUID } from 'crypto';

const router = express.Router();

router.post('/stream', async (req, res) => {
  console.log('[Chat Route] Received stream request');
  const { message, sessionId: rawSessionId } = req.body;
  const sessionId = rawSessionId || randomUUID();

  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'message is required',
      usage: 'POST /api/chat/stream with JSON body: { "message": "your question" }'
    });
  }

  await ChatMessage.create({ sessionId, role: 'user', content: message });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Session-Id', sessionId);
  res.flushHeaders();

  let fullContent = '';
  let citations = [];

  try {
    for await (const event of streamRagResponse(message, sessionId)) {
      if (event.type === 'token') {
        fullContent += event.data;
        res.write(`data: ${JSON.stringify({ type: 'token', text: event.data })}\n\n`);
      } else if (event.type === 'citations') {
        citations = event.data;
        res.write(`data: ${JSON.stringify({ type: 'citations', citations: event.data })}\n\n`);
      } else if (event.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', error: event.data })}\n\n`);
      } else if (event.type === 'done') {
        await ChatMessage.create({
          sessionId,
          role: 'assistant',
          content: fullContent,
          citations,
        });
        res.write(`data: ${JSON.stringify({ type: 'done', sessionId })}\n\n`);
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});

router.get('/history/:sessionId', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ sessionId: req.params.sessionId })
      .sort({ createdAt: 1 })
      .lean();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    // Get unique session IDs with their first message as title
    const sessions = await ChatMessage.aggregate([
      { $sort: { createdAt: 1 } },
      { $group: {
        _id: '$sessionId',
        firstMessage: { $first: '$content' },
        messageCount: { $sum: 1 },
        createdAt: { $first: '$createdAt' }
      }},
      { $sort: { createdAt: -1 } }
    ]);
    
    const sessionList = sessions.map(session => ({
      id: session._id,
      title: session.firstMessage.substring(0, 50) + (session.firstMessage.length > 50 ? '...' : ''),
      messageCount: session.messageCount,
      timestamp: session.createdAt
    }));
    
    res.json(sessionList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
