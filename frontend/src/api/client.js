const API_BASE = '/api';

export async function getDocuments() {
  const res = await fetch(`${API_BASE}/upload/documents`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadDocument(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  return res.json();
}

export function streamChat(message, sessionId, onToken, onCitations, onDone, onError) {
  const controller = new AbortController();
  let fullText = '';
  let finalCitations = [];

  fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let newSessionId = res.headers.get('X-Session-Id') || sessionId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'token' && data.text) {
                fullText += data.text;
                onToken(data.text);
              }
              if (data.type === 'citations') {
                finalCitations = data.citations || [];
                onCitations(finalCitations);
              }
              if (data.type === 'done') {
                onDone(data.sessionId || newSessionId, fullText, finalCitations);
              }
              if (data.type === 'error') onError(new Error(data.error));
            } catch (_) { }
          }
        }
      }
    })
    .catch(onError);

  return () => controller.abort();
}

export async function getChatHistory(sessionId) {
  const res = await fetch(`${API_BASE}/chat/history/${sessionId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getChatSessions() {
  const res = await fetch(`${API_BASE}/chat/sessions`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteDocument(id) {
  const res = await fetch(`${API_BASE}/upload/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  return res.json();
}
