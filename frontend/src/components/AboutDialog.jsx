import React, { useEffect, useRef } from 'react';
import { count } from '../utils/format';
import { Icon } from './Icon';

export default function AboutDialog({ open, onClose, health }) {
  const modal = useRef(null);
  useEffect(() => { if (open) modal.current?.showModal(); else modal.current?.close(); }, [open]);

  return <dialog ref={modal} className="about-dialog" onCancel={onClose} onClick={event => { if (event.target === modal.current) onClose(); }}>
    <button className="dialog-close icon-button" onClick={onClose} aria-label="Close project information"><Icon name="close"/></button>
    <div className="eyebrow">BEHIND THE ROUTE</div>
    <h2>Open roads.<br/><em>Understandable algorithms.</em></h2>
    <p>Navic is a minor-project navigator built on the MERN stack (MongoDB, Express, React, Node.js) with a C++ routing engine.
      Dijkstra, A*, BFS, DFS and Floyd–Warshall are implemented from scratch in C++ on real OpenStreetMap data.</p>
    <div className="about-stats">
      <div><strong>{health ? count(health.nodes) : '—'}</strong><span>graph nodes</span></div>
      <div><strong>{health ? count(health.edges) : '—'}</strong><span>directed edges</span></div>
      <div><strong>{health?.database === 'connected' ? 'Online' : 'Offline'}</strong><span>MongoDB</span></div>
    </div>
    <p><strong>How it fits together:</strong> React sends the trip to Express. Express forwards it to a long-running C++ process
      over stdin/stdout, which holds the 300k-node graph in memory and runs the chosen algorithm. Routes are saved in MongoDB.</p>
    <p><strong>Coverage:</strong> worldwide place search by Photon and routes by OSRM / FOSSGIS. The five C++ algorithms run on the bundled Delhi graph.
      Floyd–Warshall is O(V³), so it runs on a corridor of at most 1,500 nodes around short trips.</p>
    <p><strong>Be aware:</strong> local routes minimise road distance. ETA excludes traffic, signals and snapping gaps. Basic instructions do not
      account for turn restrictions, barriers or conditional access. This is an educational prototype.</p>
    <small>Map data © OpenStreetMap contributors, ODbL. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Report a map issue</a>.</small>
  </dialog>;
}
