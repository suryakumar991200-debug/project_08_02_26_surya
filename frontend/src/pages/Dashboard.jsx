import { useState, useEffect } from 'react';
import { getDocuments, deleteDocument } from '../api/client';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDocuments()
      .then(setDocs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.hero}>
          <h1>Knowledge base</h1>
          <p>Documents indexed for RAG.</p>
        </div>
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.hero}>
          <h1>Knowledge base</h1>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const indexed = docs.filter((d) => d.status === 'indexed');
  const processing = docs.filter((d) => d.status === 'processing');
  const failed = docs.filter((d) => d.status === 'failed');

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDocument(id);
      setDocs(docs.filter((d) => d._id !== id));
    } catch (err) {
      alert(`Failed to delete document: ${err.message}`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>Knowledge base</h1>
        <p>Documents indexed for RAG. Use the Chat to query them.</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{indexed.length}</span>
          <span className={styles.statLabel}>Indexed</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {indexed.reduce((acc, d) => acc + (d.chunkCount || 0), 0)}
          </span>
          <span className={styles.statLabel}>Total chunks</span>
        </div>
        {processing.length > 0 && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{processing.length}</span>
            <span className={styles.statLabel}>Processing</span>
          </div>
        )}
        {failed.length > 0 && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{failed.length}</span>
            <span className={styles.statLabel}>Failed</span>
          </div>
        )}
      </div>

      <ul className={styles.list}>
        {docs.map((d) => (
          <li key={d._id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.name}>{d.originalName}</span>
              <div className={styles.actions}>
                <span className={`${styles.badge} ${styles[d.status]}`}>{d.status}</span>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(d._id)}
                  title="Delete document"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className={styles.meta}>
              {d.chunkCount > 0 && <span>{d.chunkCount} chunks</span>}
              {d.uploadedAt && (
                <span>
                  {new Date(d.uploadedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {docs.length === 0 && (
        <div className={styles.empty}>
          No documents yet. Upload PDFs from the Upload page.
        </div>
      )}
    </div>
  );
}
