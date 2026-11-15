import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
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

// Multiple-choice self-check used on part pages and in labs.
export function Check({ items }) {
  const [picked, setPicked] = useState({});
  const score = items.filter((q, i) => picked[i] === q.answer).length;
  const answered = Object.keys(picked).length;
  return (
    <>
      <p className="lead">Answer from what is on this page. Each explanation says where the answer comes from.</p>
      {items.map((q, i) => (
        <article className="quiz" key={q.q}>
          <h3>{i + 1}. {q.q}</h3>
          <div className="quizopts" role="group" aria-label={`Question ${i + 1}`}>
            {q.options.map((o, j) => {
              const chosen = picked[i] === j, show = picked[i] != null;
              const cls = show ? (j === q.answer ? 'right' : chosen ? 'wrong' : '') : '';
              return <button key={o} className={cls} disabled={show} aria-pressed={chosen} onClick={() => setPicked({ ...picked, [i]: j })}>
                {show && j === q.answer && <CheckCircle2 size={15} />}{show && chosen && j !== q.answer && <XCircle size={15} />}<span><T>{o}</T></span></button>;
            })}
          </div>
          {picked[i] != null && <p className={picked[i] === q.answer ? 'verdict right' : 'verdict wrong'}><b>{picked[i] === q.answer ? 'Right.' : 'Not quite.'}</b> <T>{q.why}</T></p>}
        </article>
      ))}
      {answered === items.length && <p className="basis"><span>Score</span>{score} of {items.length}. {score === items.length ? 'Move on to the next part.' : 'Re-read the tab the explanation points to, then try again.'} <button className="linkbtn" onClick={() => setPicked({})}>Reset</button></p>}
    </>
  );
}
