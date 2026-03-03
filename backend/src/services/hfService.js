
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const EMBEDDING_MODEL = 'BAAI/bge-base-en-v1.5';
const CHAT_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';

export async function getHFEmbedding(text) {
    console.log(`[HF Embedding] Requesting embedding for text (${text.length} chars)...`);
    const response = await fetch(
        `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}`,
        {
            headers: {
                Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify({ inputs: text }),
        }
    );

    if (!response.ok) {
        const err = await response.text();
        console.error(`[HF Embedding] API Error (${response.status}):`, err);
        throw new Error(`HF Embedding Error: ${err.slice(0, 500)}`);
    }

    const result = await response.json();
    console.log(`[HF Embedding] Success: Received vector.`);
    return result;
}

export async function* streamHFChat(prompt) {
    const response = await fetch(
        `https://router.huggingface.co/v1/chat/completions`,
        {
            headers: {
                Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: [{ role: "user", content: prompt }],
                stream: true,
                max_tokens: 1024,
                temperature: 0.2,
            }),
        }
    );

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`HF Chat Error: ${err.slice(0, 500)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

            const jsonStr = trimmedLine.slice(6);
            if (jsonStr === '[DONE]') {
                console.log('[HF Chat] Stream finalized with [DONE]');
                return;
            }

            try {
                const data = JSON.parse(jsonStr);
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                    yield content;
                }
            } catch (e) {
                console.warn('[HF Chat] Error parsing JSON line:', e.message, 'Line:', trimmedLine);
            }
        }
    }
    console.log('[HF Chat] Stream ended naturally');
}
