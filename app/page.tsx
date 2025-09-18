'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const [raw, setRaw] = React.useState<string>('');
  const code = React.useMemo(
    () => raw.replace(/\D/g, '').slice(0, 6),
    [raw]
  );

  // Auto-navigate when 6 digits entered (optional, still leaves Join button)
  React.useEffect(() => {
    // no auto-join; keep it explicit per your preference
  }, [code]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaw(e.target.value);
  };

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    const pasted = e.clipboardData.getData('text');
    const digits = (pasted || '').replace(/\D/g, '').slice(0, 6);
    if (digits) {
      e.preventDefault();
      setRaw(digits);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && code.length === 6) {
      doJoin();
    }
  };

  const doJoin = () => {
    if (code.length === 6) {
      router.push(`/s/${code}`);
    }
  };

  // Styles are inline to guarantee centering & sizing independent of globals.
  const styles = {
    shell: {
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
    } as React.CSSProperties,
    card: {
      width: 'min(680px, 92vw)',
      display: 'grid',
      gap: 16,
      textAlign: 'center' as const,
    },
    title: { fontSize: 28, fontWeight: 700, margin: 0 },
    label: { fontSize: 16, opacity: 0.9 },
    inputRow: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 12,
      alignItems: 'center',
      justifyItems: 'center',
    },
    input: {
      width: '100%',
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 32,
      lineHeight: '48px',
      height: 56,
      letterSpacing: '6px',
      textAlign: 'center' as const,
      padding: '4px 12px',
      borderRadius: 12,
      border: '1px solid var(--line, #1e293b)',
      background: '#0b1327',
      color: 'var(--fg, #e6f2ff)',
      outline: 'none',
    } as React.CSSProperties,
    joinBtn: {
      height: 56,
      padding: '0 20px',
      fontSize: 18,
      fontWeight: 600,
      borderRadius: 12,
      border: '1px solid var(--line, #1e293b)',
      background: code.length === 6 ? '#2563eb' : '#0b1327',
      color: code.length === 6 ? '#fff' : 'var(--fg, #e6f2ff)',
      cursor: code.length === 6 ? 'pointer' : 'not-allowed',
      opacity: code.length === 6 ? 1 : 0.6,
    } as React.CSSProperties,
    actions: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
      marginTop: 4,
    },
    actionBtn: {
      padding: '10px 14px',
      borderRadius: 10,
      border: '1px solid var(--line, #1e293b)',
      background: '#0b1327',
      color: 'var(--fg, #e6f2ff)',
      cursor: 'pointer',
    },
    tip: { fontSize: 13, opacity: 0.8, marginTop: 2 },
    watermark: { fontSize: 12, opacity: 0.5, marginTop: 8 },
  };

  return (
    <main style={styles.shell}>
      <section style={styles.card}>
        <h1 style={styles.title}>Join your secure session</h1>

        <label style={styles.label} htmlFor="code">
          Enter the 6-digit code your agent gave you.
        </label>

        <div style={styles.inputRow}>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            aria-label="6 digit code"
            placeholder="— — — — — —"
            value={code || raw} // shows digits; placeholder shows dashes when empty
            onChange={onChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            style={styles.input}
            maxLength={12} // raw may include spaces/dashes when typing; we sanitize anyway
          />

          <button
            type="button"
            onClick={doJoin}
            disabled={code.length !== 6}
            style={styles.joinBtn}
          >
            Join
          </button>
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.actionBtn}
            onClick={() => location.assign('/about')}
            aria-label="Learn about EOV6"
          >
            Learn about EOV6
          </button>

          <button
            type="button"
            style={styles.actionBtn}
            onClick={() => location.assign('/ivr')}
            aria-label="Use IVR instead"
          >
            Use IVR instead
          </button>
        </div>

        <p style={styles.tip} className="mono">
          Tip: you can paste the whole code — we’ll format it automatically.
        </p>

        <p style={styles.watermark} className="mono">
          MW: root-join v4 • ui-polish
        </p>
      </section>
    </main>
  );
}
