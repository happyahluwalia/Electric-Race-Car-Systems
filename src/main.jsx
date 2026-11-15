import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Search, Zap } from 'lucide-react';
import Explore from './pages/Explore.jsx';
import { Labs, Glossary, Sources } from './pages/Pages.jsx';
import { components } from './data/components.js';
import { systems } from './data/systems.js';
import { journeys } from './data/journeys.js';
import { labs } from './data/labs.js';
import { glossary } from './data/glossary.js';
import './app.css';

const index = [
  ...systems.map(s => ({ kind: 'System', label: s.name, hint: s.question, to: `/system/${s.id}` })),
  ...components.map(c => ({ kind: 'Part', label: c.name, hint: c.plain, to: c.systems[0] ? `/system/${c.systems[0]}/${c.id}` : `/part/${c.id}`, extra: c.label })),
  ...journeys.map(j => ({ kind: 'Journey', label: j.name, hint: j.blurb, to: `/journey/${j.id}` })),
  ...labs.map(l => ({ kind: 'Lab', label: l.name, hint: l.blurb, to: `/labs/${l.id}` })),
  ...glossary.map(g => ({ kind: 'Term', label: g.term, hint: g.meaning, to: '/glossary' }))
];

function SearchBox() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const box = useRef();
  const needle = q.trim().toLowerCase();
  const hits = needle ? index.filter(x => (x.label + ' ' + (x.extra || '') + ' ' + x.hint).toLowerCase().includes(needle))
    .sort((a, b) => (b.label.toLowerCase().startsWith(needle) ? 1 : 0) - (a.label.toLowerCase().startsWith(needle) ? 1 : 0)).slice(0, 8) : [];
  useEffect(() => {
    const close = e => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const go = to => { navigate(to); setQ(''); setOpen(false); };
  return (
    <div className="search" ref={box}>
      <Search size={16} />
      <input value={q} placeholder="Search parts, terms, labs" aria-label="Search" onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onKeyDown={e => { if (e.key === 'Enter' && hits[0]) go(hits[0].to); if (e.key === 'Escape') setOpen(false); }} />
      {open && needle && (
        <ul>
          {hits.map(h => <li key={h.kind + h.label}><button onClick={() => go(h.to)}><small>{h.kind}</small><b>{h.label}</b><span>{h.hint}</span></button></li>)}
          {hits.length === 0 && <li className="none">No matches for "{q}"</li>}
        </ul>
      )}
    </div>
  );
}

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    const panel = document.querySelector('.panel');
    if (panel) panel.scrollTop = 0;
    if (pathname.startsWith('/labs') || pathname === '/glossary' || pathname === '/sources') window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  const { pathname } = useLocation();
  const exploring = pathname === '/' || /^\/(system|journey|part)\//.test(pathname);
  return (
    <div className={exploring ? 'app fixed' : 'app'}>
      <header className="top">
        <Link to="/" className="brand"><span><Zap size={18} /></span><b>EV Systems Explorer<small>Electric race car, one system at a time</small></b></Link>
        <nav>
          <NavLink to="/" className={() => (exploring ? 'on' : '')}>Explore</NavLink>
          <NavLink to="/labs" className={({ isActive }) => (isActive ? 'on' : '')}>Labs</NavLink>
          <NavLink to="/glossary" className={({ isActive }) => (isActive ? 'on' : '')}>Glossary</NavLink>
          <NavLink to="/sources" className={({ isActive }) => (isActive ? 'on' : '')}>Sources</NavLink>
        </nav>
        <SearchBox />
      </header>
      <ScrollReset />
      <Routes>
        <Route path="/" element={<Explore />} />
        <Route path="/system/:sid" element={<Explore />} />
        <Route path="/system/:sid/:cid" element={<Explore />} />
        <Route path="/part/:cid" element={<Explore />} />
        <Route path="/journey/:jid" element={<Explore />} />
        <Route path="/journey/:jid/:step" element={<Explore />} />
        <Route path="/labs" element={<Labs />} />
        <Route path="/labs/:lab" element={<Labs />} />
        <Route path="/glossary" element={<Glossary />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="*" element={<div className="notfound"><h2>That page does not exist.</h2><Link to="/">Back to the whole car</Link></div>} />
      </Routes>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>);
