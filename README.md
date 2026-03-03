# OpsMind AI — Enterprise SOP Neural Brain (RAG)

Context-aware corporate knowledge assistant: upload PDFs, get **cited answers** from your documents. If the answer isn’t in the knowledge base, the system says **"I don’t know."** (Hallucination guardrail.)

Built per the **SDE MERN PROJECT DOC** (Infotact Solutions): Week 1–2+ implementation with separated **backend** and **frontend**, RAG pipeline, and production-oriented stack.

---

## Table of contents

- [Features](#features)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [Backend](#backend)
- [Frontend](#frontend)
- [Setup & run](#setup--run)
- [Troubleshooting (PowerShell / npm)](#troubleshooting-powershell--npm)
- [MongoDB Atlas Vector Search](#mongodb-atlas-vector-search)
- [Environment variables](#environment-variables)
- [Week-by-week implementation](#week-by-week-implementation)

---

## Features

- **RAG pipeline**: PDF upload → parse → 1000‑char overlapping chunks → embeddings (text-embedding-004) → MongoDB Atlas Vector Search → semantic retrieval.
- **Precision citations**: Every answer cites source document and page number; UI shows **Reference Cards**.
- **Hallucination guardrail**: Answers only from indexed context; otherwise responds with "I don’t know."
- **Streaming**: Chat responses streamed to the UI via Server-Sent Events (SSE).
- **Chat history**: Stored in MongoDB for follow-up context (Week 4 scope).
- **Documents dashboard**: List indexed documents and chunk counts (knowledge-base overview).

---

## Project structure

```
project_08_02_26/
├── backend/                 # Node.js (Express) API
│   ├── src/
│   │   ├── config/          # DB connection
│   │   ├── models/          # Mongoose: Document, DocumentChunk, ChatMessage
│   │   ├── routes/          # upload, chat (stream + history)
│   │   ├── services/        # pdfParser, embeddings, vectorSearch, rag
│   │   └── server.js
│   ├── uploads/             # Temp PDF uploads (created at runtime)
│   ├── .env.example
│   └── package.json
├── frontend/                # React (Vite) SPA
│   ├── src/
│   │   ├── api/             # API client (upload, stream chat, history)
│   │   ├── components/      # Layout, ReferenceCards
│   │   ├── pages/           # Chat, Upload, Dashboard (Documents)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js      # Proxy /api -> backend
│   └── package.json
├── SDE MERN PROJECT DOC.pdf
└── README.md                # This file
```

---

## Tech stack

| Layer        | Technology |
|-------------|------------|
| **Backend** | Node.js, Express, Mongoose |
| **LLM**     | Llama-3.1-8B-Instruct (Hugging Face) |
| **Embeddings** | bge-base-en-v1.5 (Hugging Face) |
| **Vector DB**  | MongoDB Atlas Vector Search |
| **PDF**     | pdf-parse; chunking 1000 chars, 200 overlap |
| **Frontend**| React 18, Vite, React Router |
| **Streaming** | Server-Sent Events (SSE) |

---

## Backend

- **Responsibilities**
  - File upload (Multer), PDF parsing, chunking, embedding generation, storing chunks (with embeddings) in MongoDB.
  - Vector search (Atlas `$vectorSearch` or in-memory cosine fallback).
  - RAG: merge user query + top‑3 chunks → system prompt → Gemini 1.5 Flash; stream tokens and citations.
  - Chat: POST `/api/chat/stream` (SSE), GET `/api/chat/history/:sessionId`.
  - Documents: GET `/api/upload/documents`.

- **Key files**
  - `src/services/pdfParser.js` — PDF → text → chunks (1000/200).
  - `src/services/embeddings.js` — Google text-embedding-004.
  - `src/services/vectorSearch.js` — Atlas vector search or fallback.
  - `src/services/rag.js` — Retrieve chunks, build prompt, stream Gemini response + citations.
  - `src/routes/upload.js` — POST file, GET documents list.
  - `src/routes/chat.js` — POST stream, GET history.

- **Run**
  - `cd backend && npm install && npm run dev` (or `npm start`). Default port **5000**.

- **Manual Testing (Postman/Curl)**
  - **Endpoint**: `POST http://localhost:5000/api/chat/stream`
  - **Headers**: `Content-Type: application/json`
  - **Body**:
    ```json
    {
      "message": "Hello, how are you?"
    }
    ```
  - **Note**: This is an SSE (Server-Sent Events) endpoint. In Postman, you will see the full response stream.

---

## Frontend

- **Responsibilities**
  - **Best UI/UX**: Dark theme (slate/teal), Outfit + JetBrains Mono, clear hierarchy, responsive layout.
  - **Chat**: Input, streaming replies, **Reference Cards** (source + page + excerpt) under each answer.
  - **Upload**: Drag‑and‑drop or file picker; upload & index; success/error feedback.
  - **Documents**: Dashboard of indexed documents and total chunks.

- **Key files**
  - `src/pages/Chat.jsx` — Chat UI, SSE consumption, display of messages and citations.
  - `src/components/ReferenceCards.jsx` — Citation cards (source, page, excerpt).
  - `src/pages/Upload.jsx` — File dropzone and upload.
  - `src/pages/Dashboard.jsx` — Documents list and stats.
  - `src/api/client.js` — `uploadDocument`, `streamChat`, `getDocuments`, `getChatHistory`.
  - `src/index.css` — CSS variables (colors, radii, fonts); global styles.

- **Run**
  - `cd frontend && npm install && npm run dev`. Dev server **5173** with proxy to backend `/api`.

---

## Setup & run

1. **Clone / open project**
   - Ensure you have Node.js 18+ and a MongoDB Atlas cluster.

2. **Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env: MONGODB_URI, HUGGINGFACE_API_KEY, FRONTEND_URL
   npm install
   npm run dev
   ```

3. **MongoDB Atlas Setup**
   - **Network Access**: Go to MongoDB Atlas → **Network Access** → **Add IP Address**
     - For development: Add `0.0.0.0/0` (allows all IPs) or your current IP
     - For production: Use specific IPs only
   - **Database**: The connection string includes `/opsmind` - MongoDB will create it automatically
   - **Vector Search Index**: Create the index on `documentchunks` collection (see [MongoDB Atlas Vector Search](#mongodb-atlas-vector-search))

4. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Use the app**
   - Open `http://localhost:5173`.
   - Upload a PDF from **Upload**.
   - Ask questions in **Chat**; check **Reference Cards** and streaming.
   - View **Documents** for indexed files and chunk counts.

---

## Troubleshooting

### MongoDB Connection Error (`ECONNREFUSED`)

If you see `ECONNREFUSED` when starting the backend:

1. **Check IP Whitelist** (most common):
   - Go to [MongoDB Atlas](https://cloud.mongodb.com) → Your Cluster → **Network Access**
   - Click **Add IP Address**
   - For development: Add `0.0.0.0/0` (allows all IPs) or click **Allow Access from Anywhere**
   - For production: Add only your server's IP
   - Wait 1-2 minutes for changes to propagate

2. **Verify credentials**:
   - Check username/password in `backend/.env` matches your Atlas database user
   - Ensure the user has read/write permissions

3. **Check cluster status**:
   - Ensure your cluster is **running** (not paused)
   - Free tier clusters pause after inactivity

4. **Test connection**:
   - Try connecting from MongoDB Compass or Atlas web shell
   - If that works, the issue is likely IP whitelist

### PowerShell / npm Script Error

If you see:

**"npm.ps1 cannot be loaded because running scripts is disabled on this system"**

PowerShell’s execution policy is blocking scripts. Fix it in one of these ways:

1. **Allow scripts for your user (recommended)**  
   In PowerShell, run once:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   If you get an error, open **PowerShell as Administrator** and run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
   ```
   Then close and reopen the terminal and run `npm install` again.

2. **Use Command Prompt instead**  
   Open **cmd.exe** (not PowerShell), then:
   ```cmd
   cd d:\project_08_02_26\backend
   npm install
   npm run dev
   ```
   In another cmd window:
   ```cmd
   cd d:\project_08_02_26\frontend
   npm install
   npm run dev
   ```
   `npm` works in cmd without changing execution policy.

---

## MongoDB Atlas Vector Search

For production-quality retrieval, create a **vector search index** on the collection that stores chunks (e.g. `documentchunks`):

- **Database / collection**: same as in your Mongoose model (e.g. default `documentchunks`).
- **Index name**: e.g. `vector_index` (must match `vectorSearch.js`).
- **Field**: `embedding` — type **vector**, dimensions **768** (text-embedding-004), similarity **cosine**.

If the index is missing, the backend falls back to in-memory cosine similarity over all chunks (fine for small datasets).

---

## Environment variables

**Backend (`.env`)**

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 5000). |
| `MONGODB_URI` | MongoDB Atlas connection string. |
| `HUGGINGFACE_API_KEY` | Hugging Face API key. |
| `FRONTEND_URL` | Allowed CORS origin (e.g. `http://localhost:5173`). |

---

## Week-by-week implementation (from SDE MERN PROJECT DOC)

| Week | Goal | Implemented in this repo |
|------|------|---------------------------|
| **1** | Knowledge ingestion | Multer upload; PDF parse + 1000/200 chunking; embeddings; MongoDB chunks; Gemini integration; SSE streaming to frontend. |
| **2** | Retrieval engine | `$vectorSearch` (with fallback); merge query + top‑3 chunks into system prompt; RAG synthesis. |
| **3** | Chat & synthesis | Chat UI; streaming; **Reference Cards**; hallucination behavior (“I don’t know” when no context). |
| **4** | Optimization & deploy | Chat history in MongoDB; structure ready for RBAC and deployment (e.g. Vercel frontend, Render backend). |

---

## License

Proprietary — Infotact Solutions / project spec.
