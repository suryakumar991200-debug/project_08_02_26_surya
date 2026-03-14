import styles from './ReferenceCards.module.css';

export default function ReferenceCards({ citations }) {
  if (!citations?.length) return null;

  // ksjgjs
  // fkjkjwfkap
  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Sources</span>
      <div className={styles.cards}>
        {citations.map((c, i) => (
          <div key={i} className={styles.card}>
            <span className={styles.source}>
              {c.source}
              {c.pageNumber != null && (
                <span className={styles.page}> · p.{c.pageNumber}</span>
              )}
            </span>
            {c.excerpt && (
              <p className={styles.excerpt}>{c.excerpt}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
