/**
 * Copy Button — copies text to clipboard with visual feedback
 */
import { useState, useCallback } from 'react';
import { CopyIcon, CheckIcon } from './Icons';

export default function CopyButton({ text, size = 14, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      className={`copy-btn ${copied ? 'copied' : ''} ${className}`}
      onClick={handleCopy}
      title={copied ? 'Copied' : 'Copy to clipboard'}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {copied ? <CheckIcon size={size} /> : <CopyIcon size={size} />}
    </button>
  );
}
