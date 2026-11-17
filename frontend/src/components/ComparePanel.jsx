import React from 'react';
import { ALGORITHMS } from '../constants/algorithms';
import { count, distance, milliseconds } from '../utils/format';
import { Icon } from './Icon';

// Side-by-side metrics for all five C++ algorithms on the same trip.
export default function ComparePanel({ comparison, onClose }) {
  const found = comparison.results.filter(r => r.found);
  const shortest = Math.min(...found.map(r => r.distance_m));
  const fastest = Math.min(...found.map(r => r.search_ms));
  const fewest = Math.min(...found.map(r => r.visited_nodes));

  return <section className="route-result compare-panel" aria-live="polite">
    <div className="result-heading">
      <span><Icon name="route" size={16}/> ALGORITHM COMPARISON</span>
      <button className="icon-button" onClick={onClose} aria-label="Close comparison"><Icon name="close" size={15}/></button>
    </div>
    <p className="route-caveat">Same snapped start and end nodes, {comparison.mode} mode. Search time is measured inside the C++ engine.</p>
    <div className="compare-table" role="table">
      <div role="row" className="compare-row head">
        <span role="columnheader">Algorithm</span><span role="columnheader">Distance</span>
        <span role="columnheader">Explored</span><span role="columnheader">Time</span>
      </div>
      {comparison.results.map(r => <div role="row" key={r.algorithm} className="compare-row">
        <span role="cell" className="algo-name"><i style={{ background: ALGORITHMS[r.algorithm].color }}/>{ALGORITHMS[r.algorithm].short}</span>
        {r.found ? <>
          <span role="cell" className={r.distance_m - shortest < 0.5 ? 'best' : ''}>{distance(r.distance_m)}</span>
          <span role="cell" className={r.visited_nodes === fewest ? 'best' : ''}>{count(r.visited_nodes)}</span>
          <span role="cell" className={r.search_ms === fastest ? 'best' : ''}>{milliseconds(r.search_ms)}</span>
        </> : <span role="cell" className="not-found">Corridor too small for this trip</span>}
      </div>)}
    </div>
    <details className="engine-details">
      <summary>What am I looking at?</summary>
      {comparison.results.map(r => <p key={r.algorithm}><strong>{ALGORITHMS[r.algorithm].short}:</strong> {r.note}</p>)}
    </details>
  </section>;
}
