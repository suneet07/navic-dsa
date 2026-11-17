import React, { useEffect, useRef, useState } from 'react';
import { compareAlgorithms, getRoute, searchPlaces } from './api/navic';
import AboutDialog from './components/AboutDialog';
import ComparePanel from './components/ComparePanel';
import ExploreSection from './components/ExploreSection';
import Header from './components/Header';
import { Icon } from './components/Icon';
import MapView from './components/MapView';
import PlannerForm from './components/PlannerForm';
import RouteResult from './components/RouteResult';
import { useApiHealth } from './hooks/useApiHealth';
import { useCurrentLocation } from './hooks/useCurrentLocation';

export default function App() {
  const { health, status, retry } = useApiHealth();
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const [mode, setMode] = useState('driving');
  const [algorithm, setAlgorithm] = useState('world');
  const [route, setRoute] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [busy, setBusy] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [exampleBusy, setExampleBusy] = useState(false);
  const [error, setError] = useState('');
  const [pickTarget, setPickTarget] = useState('source');
  const [offline, setOffline] = useState(false);
  const [about, setAbout] = useState(false);
  const [showExplored, setShowExplored] = useState(true);
  const [historyKey, setHistoryKey] = useState(0);

  // Any change to the inputs invalidates in-flight requests and old results.
  const requestAbort = useRef(null);
  const revision = useRef(0);
  const invalidate = () => {
    revision.current++;
    requestAbort.current?.abort();
    setBusy(false); setComparing(false); setRoute(null); setComparison(null); setError('');
  };

  const location = useCurrentLocation(place => {
    invalidate(); setSource(place); setPickTarget('destination');
  });

  const updateSource = value => { location.cancel(); invalidate(); setSource(value); };
  const updateDestination = value => { invalidate(); setDestination(value); };
  const pick = point => {
    if (pickTarget === 'source') { updateSource(point); setPickTarget('destination'); }
    else updateDestination(point);
  };

  // Runs a request with abort + stale-response protection.
  const run = async (task, setLoading, onResult) => {
    requestAbort.current?.abort();
    const controller = new AbortController();
    requestAbort.current = controller;
    const current = revision.current;
    setLoading(true); setError(''); setRoute(null); setComparison(null);
    try {
      const result = await task(controller.signal);
      if (current === revision.current && !controller.signal.aborted) onResult(result);
    } catch (err) {
      if (!controller.signal.aborted && current === revision.current) setError(err.message);
    } finally {
      if (current === revision.current) setLoading(false);
    }
  };

  const findRoute = (trip = { source, destination, mode, algorithm }) => {
    if (!trip.source || !trip.destination) return;
    run(signal => getRoute(trip, signal), setBusy, result => { setRoute(result); setHistoryKey(k => k + 1); });
  };

  const compare = () => {
    if (!source || !destination) return;
    run(signal => compareAlgorithms({ source, destination, mode }, signal), setComparing, setComparison);
  };

  const loadExample = async to => {
    location.cancel(); invalidate(); setExampleBusy(true);
    const current = revision.current;
    try {
      const [a, b] = await Promise.all([searchPlaces('NSUT', { local: true }), searchPlaces(to, { local: true })]);
      if (current !== revision.current) return;
      if (!a.results.length || !b.results.length) throw new Error('This example is unavailable in the current extract. Search or choose points on the map.');
      if (algorithm === 'world') setAlgorithm('astar');
      setSource(a.results[0]); setDestination(b.results[0]); setPickTarget('destination');
    } catch (err) { if (current === revision.current) setError(err.message); }
    finally { setExampleBusy(false); }
  };

  const replay = item => {
    location.cancel(); invalidate();
    setSource(item.source); setDestination(item.destination); setMode(item.mode); setAlgorithm(item.algorithm);
    findRoute({ source: item.source, destination: item.destination, mode: item.mode, algorithm: item.algorithm });
  };

  useEffect(() => () => requestAbort.current?.abort(), []);

  return <div className="app">
    <Header onAbout={() => setAbout(true)}/>
    <main className="workspace">
      <aside id="planner" className="sidebar" tabIndex={-1} aria-label="Route planner">
        <div className="planner-content">
          <div className="eyebrow"><span className="short-line"/> YOUR CITY, CONNECTED</div>
          <h1>Every journey<br/> starts <em>somewhere.</em></h1>
          <p className="intro">Find a road route anywhere in the world — or watch five classic graph algorithms race across Delhi.</p>

          <PlannerForm
            mode={mode} onMode={value => { invalidate(); setMode(value); }}
            source={source} destination={destination} onSource={updateSource} onDestination={updateDestination}
            onSwap={() => { location.cancel(); invalidate(); setSource(destination); setDestination(source); }}
            setPickTarget={setPickTarget} location={location}
            algorithm={algorithm} onAlgorithm={value => { invalidate(); setAlgorithm(value); }}
            onSubmit={() => findRoute()} onCompare={compare}
            busy={busy} comparing={comparing} ready={Boolean(health)}
          />

          {error && <div className="error-message" role="alert"><Icon name="info" size={18}/><span>{error}</span>
            <button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><Icon name="close" size={16}/></button></div>}
          {!health && <div className="connection-note" role="status">{status}<button onClick={retry}>Retry connection</button></div>}

          {comparison ? <ComparePanel comparison={comparison} onClose={() => setComparison(null)}/>
            : route ? <RouteResult route={route} mode={mode} showExplored={showExplored} onToggleExplored={() => setShowExplored(v => !v)}/>
            : <ExploreSection ready={Boolean(health)} busy={exampleBusy || busy} onExample={loadExample} onReplay={replay} refreshKey={historyKey}/>}
        </div>
        <footer className="sidebar-footer">
          <span className={`status-dot ${health ? '' : 'pending'}`}/>
          <span>{health ? `Connected · C++ engine ready · MongoDB ${health.database}` : 'Waiting for the routing engine'}</span>
          <button onClick={() => setAbout(true)} aria-label="About this project"><Icon name="info" size={16}/></button>
        </footer>
      </aside>
      <MapView source={source} destination={destination} route={route} comparison={comparison} showExplored={showExplored}
        onPick={pick} pickTarget={pickTarget} offline={offline} setOffline={setOffline}/>
    </main>
    <AboutDialog open={about} onClose={() => setAbout(false)} health={health}/>
  </div>;
}
