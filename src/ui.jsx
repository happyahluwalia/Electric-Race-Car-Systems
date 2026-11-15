import React from 'react';
import { ExternalLink } from 'lucide-react';
import { sources } from './data/sources.js';
import { glossary } from './data/glossary.js';

// Wrap known abbreviations in <abbr> so a hover (or tap) explains them.
const terms = [...glossary].sort((a, b) => b.term.length - a.term.length);
const pattern = new RegExp(`(?<![A-Za-z0-9])(${terms.map(t => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![A-Za-z0-9])`, 'g');
const meaning = Object.fromEntries(terms.map(t => [t.term, t.meaning]));

export function T({ children }) {
  if (typeof children !== 'string') return children;
  const out = []; let last = 0; const seen = new Set();
  for (const m of children.matchAll(pattern)) {
    if (seen.has(m[1])) continue; // annotate each term once per paragraph
    seen.add(m[1]);
    out.push(children.slice(last, m.index));
    out.push(<abbr key={m.index} title={meaning[m[1]]} tabIndex={0}>{m[1]}</abbr>);
    last = m.index + m[1].length;
  }
  out.push(children.slice(last));
  return <>{out}</>;
}

export function SourceLinks({ ids, label = 'Based on' }) {
  if (!ids || !ids.length) return null;
  return (
    <p className="basis">
      <span>{label}</span>
      {ids.map(id => (
        <a key={id} href={sources[id].url} target="_blank" rel="noreferrer">{sources[id].title}<ExternalLink size={12} /></a>
      ))}
    </p>
  );
}
