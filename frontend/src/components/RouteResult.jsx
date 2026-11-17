import React from 'react';
import { ALGORITHMS } from '../constants/algorithms';
import { count, distance, duration, milliseconds } from '../utils/format';
import { Icon } from './Icon';

const stepIcon = maneuver => (maneuver === 'arrive' ? 'flag' : maneuver === 'left' ? 'left' : maneuver === 'right' ? 'right' : 'straight');

export default function RouteResult({ route, mode, showExplored, onToggleExplored }) {
  const local = route.provider === 'navic';
  const meta = ALGORITHMS[route.algorithm] || ALGORITHMS.world;
  return <section className="route-result" aria-live="polite">
    <div className="result-heading">
      <span><Icon name="check" size={16}/> YOUR ROUTE IS READY</span>
      <span className="result-mode">{mode}</span>
    </div>
    <div className="route-metrics">
      <div><strong>{duration(route.duration_s)}</strong><span>Estimated travel time</span></div>
      <div><strong>{distance(route.distance_m)}</strong><span>Road distance</span></div>
    </div>
    <p className="route-caveat">
      {local ? `${meta.short} on the local C++ graph` : 'OSRM road route'} · no live traffic<br/>
      Snapping gaps: {distance(route.snapped.source.distance_m)} at start, {distance(route.snapped.destination.distance_m)} at end.
    </p>

    {local && <div className="algo-stats">
      <div><strong>{count(route.visited_nodes)}</strong><span>nodes explored</span></div>
      <div><strong>{count(route.hops)}</strong><span>road segments</span></div>
      <div><strong>{route.cached ? 'cached' : milliseconds(route.search_ms)}</strong><span>C++ search time</span></div>
      <label className="explored-toggle"><input type="checkbox" checked={showExplored} onChange={onToggleExplored}/> Show explored nodes on map</label>
    </div>}

    <details className="directions" open>
      <summary>Turn by turn <span>{route.steps.length} steps</span></summary>
      <ol>{route.steps.map((step, index) => <li key={index}>
        <span className="step-icon"><Icon name={stepIcon(step.maneuver)} size={19}/></span>
        <div><p>{step.instruction}</p>{step.distance_m > 0 && <small>{distance(step.distance_m)}</small>}</div>
      </li>)}</ol>
    </details>

    <details className="engine-details">
      <summary>Under the hood</summary>
      <p>{!local ? 'Worldwide directions by OSRM / FOSSGIS.'
        : route.cached ? 'Route served from the in-memory cache; no new search performed.'
        : `${count(route.visited_nodes)} nodes explored and ${count(route.relaxations)} relaxations in ${milliseconds(route.search_ms)} (C++ search only).`}</p>
      <p>{meta.summary}{meta.complexity && <> Complexity: <code>{meta.complexity}</code>.</>}</p>
      {route.note && <p>{route.note}</p>}
      <ul>{route.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
    </details>
  </section>;
}
