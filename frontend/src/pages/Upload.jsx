import { useState, useCallback } from 'react';
import { uploadDocument } from '../api/client';
import styles from './Upload.module.css';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') {
      setFile(f);
      setError(null);
      setResult(null);
    } else {
      setError('Please drop a PDF file.');
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleSelect = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setError(null);
      setResult(null);
    }
  };

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const data = await uploadDocument(file);
      setResult(data);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>Upload documents</h1>
        <p>Add PDFs to your knowledge base. They will be chunked, embedded, and searchable.</p>
      </div>

      <div
        className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''} ${file ? styles.hasFile : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleSelect}
          className={styles.hiddenInput}
          id="file-input"
        />
        <label htmlFor="file-input" className={styles.label}>
          {file ? (
            <>
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileSize}>
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </>
          ) : (
            <>
              Drop a PDF here or <span className={styles.browse}>browse</span>
            </>
          )}
        </label>
      </div>

      {file && (
        <button
          type="button"
          onClick={submit}
          disabled={uploading}
          className={styles.uploadBtn}
        >
          {uploading ? 'Processing…' : 'Upload & index'}
        </button>
      )}

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {result && (
        <div className={styles.success}>
          <strong>Indexed:</strong> {result.originalName} — {result.chunkCount} chunks.
        </div>
      )}
    </div>
  );
}
