import React, { useEffect, useState } from 'react';
import { getHistory } from '../api/navic';
import { ALGORITHMS } from '../constants/algorithms';
import { distance } from '../utils/format';
import { Icon } from './Icon';

const JOURNEYS = [
  { to: 'Vegas', title: 'From campus to a coffee', subtitle: 'NSUT → Vegas Mall, Dwarka · works with all 5', art: '' },
  { to: 'India Gate', title: 'Take the city route', subtitle: 'NSUT → India Gate', art: 'warm' },
];

// Example journeys plus recent routes stored in MongoDB.
export default function ExploreSection({ ready, busy, onExample, onReplay, refreshKey }) {
  const [history, setHistory] = useState({ enabled: false, routes: [] });
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    getHistory(5, controller.signal).then(setHistory).catch(() => {});
    return () => controller.abort();
  }, [ready, refreshKey]);

  return <section className="explore">
    <div className="section-heading"><h2>A good place to start</h2><span>TRY A JOURNEY</span></div>
    {JOURNEYS.map(journey =>
      <button key={journey.to} className="journey-card" disabled={busy || !ready} onClick={() => onExample(journey.to)}>
        <span className={`journey-art ${journey.art}`}><Icon name={journey.art ? 'compass' : 'route'} size={28}/></span>
        <span><strong>{journey.title}</strong><small>{journey.subtitle}</small></span>
        <Icon name="arrow" size={17}/>
      </button>)}

    {history.enabled && history.routes.length > 0 && <>
      <div className="section-heading recent-heading"><h2>Recent journeys</h2><span>FROM MONGODB</span></div>
      {history.routes.map(item =>
        <button key={item._id} className="journey-card recent-card" disabled={busy || !ready} onClick={() => onReplay(item)}>
          <span className="journey-art small"><Icon name="clock" size={20}/></span>
          <span>
            <strong>{item.source.name || 'Start'} → {item.destination.name || 'End'}</strong>
            <small>{ALGORITHMS[item.algorithm]?.short || item.algorithm} · {item.mode} · {distance(item.distanceM)}</small>
          </span>
          <Icon name="arrow" size={17}/>
        </button>)}
    </>}

    <div className="map-tip"><Icon name="pin" size={17}/><p>Have a spot in mind?<br/><strong>Choose your endpoints directly on the map.</strong></p></div>
  </section>;
}
