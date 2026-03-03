import { useState, useRef, useEffect } from 'react';
import { streamChat, getChatHistory, getChatSessions, uploadDocument } from '../api/client';
import ReferenceCards from '../components/ReferenceCards';
import styles from './Chat.module.css';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [citations, setCitations] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('opsmind_session') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (sessionId) localStorage.setItem('opsmind_session', sessionId);
  }, [sessionId]);

  // Load chat history when component mounts
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const sessions = await getChatSessions();
      setChatHistory(sessions);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      // Fallback to localStorage
      const savedHistory = localStorage.getItem('chat_history');
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const send = () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput('');
    setCitations([]);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setLoading(true);
    setStreamingContent('');

    streamChat(
      text,
      sessionId,
      (token) => setStreamingContent((c) => c + token),
      (cits) => setCitations(cits || []),
      (newSessionId, fullContent, finalCitations) => {
        setSessionId(newSessionId);
        const newMessages = [
          ...messages,
          { role: 'user', content: text },
          { role: 'assistant', content: fullContent, citations: finalCitations },
        ];
        setMessages(newMessages);
        setStreamingContent('');
        setCitations([]);
        setLoading(false);
        
        // Save to chat history
        saveToHistory(newSessionId, text, newMessages);
      },
      (err) => {
        setError(err.message);
        setStreamingContent('');
        setLoading(false);
      }
    );
  };

  const saveToHistory = (sessionId, firstMessage, messageList) => {
    // The backend will automatically track sessions through the /sessions endpoint
    // Just refresh the chat history
    loadChatHistory();
  };

  const loadChatSession = async (sessionId) => {
    try {
      setLoading(true);
      const history = await getChatHistory(sessionId);
      setMessages(history.messages || []);
      setSessionId(sessionId);
      setStreamingContent('');
      setCitations([]);
      setError(null);
    } catch (err) {
      setError('Failed to load chat history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId('');
    setStreamingContent('');
    setCitations([]);
    setError(null);
    localStorage.removeItem('opsmind_session');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadFile(file);
      setUploadError(null);
      setUploadResult(null);
    } else {
      setUploadError('Please select a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || uploading) return;
    
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    
    try {
      const result = await uploadDocument(uploadFile);
      setUploadResult(result);
      setUploadFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Close modal after successful upload
      setTimeout(() => {
        setShowUploadModal(false);
      }, 2000);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadResult(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayMessages = [...messages];
  if (streamingContent) {
    displayMessages.push({ role: 'assistant', content: streamingContent, citations, streaming: true });
  }

  return (
    <div className={styles.chatContainer}>
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${showHistory ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2>Chat History</h2>
          <button 
            className={styles.closeSidebarBtn}
            onClick={() => setShowHistory(false)}
          >
            ✕
          </button>
        </div>
        
        <div className={styles.historyActions}>
          <button 
            className={styles.newChatBtn}
            onClick={startNewChat}
          >
            + New Chat
          </button>
        </div>
        
        <div className={styles.historyList}>
          {chatHistory.length === 0 ? (
            <div className={styles.emptyHistory}>
              <p>No chat history yet</p>
              <p className={styles.historyHint}>Start a conversation to see it here</p>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div 
                key={chat.id}
                className={`${styles.historyItem} ${chat.id === sessionId ? styles.active : ''}`}
                onClick={() => {
                  loadChatSession(chat.id);
                  setShowHistory(false);
                }}
              >
                <div className={styles.historyTitle}>{chat.title}</div>
                <div className={styles.historyMeta}>
                  <span>{new Date(chat.timestamp).toLocaleDateString()}</span>
                  <span>{chat.messageCount} messages</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.chatMain}>
        <div className={styles.chatHeader}>
          <button 
            className={styles.menuBtn}
            onClick={() => setShowHistory(true)}
          >
            ☰ Menu
          </button>
          <h1>Ask your knowledge base</h1>
          <button 
            className={styles.uploadBtn}
            onClick={() => setShowUploadModal(true)}
            title="Upload documents during chat"
          >
            +
          </button>
        </div>
        
        <div className={styles.hero}>
          <p>Get cited answers from your uploaded SOPs and documents. If we don’t know, we’ll say so.</p>
        </div>

      <div className={styles.messages}>
        {displayMessages.length === 0 && !streamingContent && (
          <div className={styles.empty}>
            <p>Ask anything from your documents, e.g.</p>
            <ul>
              <li>How do I process a refund?</li>
              <li>What is the policy for extended sick leave?</li>
            </ul>
          </div>
        )}
        {displayMessages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>
            <span className={styles.role}>{msg.role === 'user' ? 'You' : 'OpsMind AI'}</span>
            <div className={styles.content}>{msg.content || '\u00A0'}</div>
            {msg.citations?.length > 0 && (
              <ReferenceCards citations={msg.citations} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className={styles.errorBanner}>
          {error}
        </div>
      )}

        <form
          className={styles.form}
          onSubmit={(e) => { e.preventDefault(); send(); }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
            className={styles.input}
            autoFocus
          />
          <button type="submit" disabled={loading || !input.trim()} className={styles.sendBtn}>
            {loading ? '...' : 'Send'}
          </button>
        </form>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className={styles.modalOverlay} onClick={closeUploadModal}>
          <div className={styles.uploadModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Upload Document</h2>
              <button className={styles.closeModalBtn} onClick={closeUploadModal}>
                ✕
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className={styles.fileInput}
              />
              
              {uploadFile && (
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{uploadFile.name}</span>
                  <span className={styles.fileSize}>
                    ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
              
              {uploadFile && (
                <button
                  className={styles.uploadSubmitBtn}
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload & Index'}
                </button>
              )}
              
              {uploadError && (
                <div className={styles.uploadError}>{uploadError}</div>
              )}
              
              {uploadResult && (
                <div className={styles.uploadSuccess}>
                  Successfully indexed: {uploadResult.originalName} ({uploadResult.chunkCount} chunks)
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
