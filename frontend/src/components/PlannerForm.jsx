import React from 'react';
import { ALGORITHMS, ALGORITHM_OPTIONS } from '../constants/algorithms';
import { Icon } from './Icon';
import SearchBox from './SearchBox';

const MODES = [['driving', 'car', 'Drive'], ['walking', 'walk', 'Walk'], ['cycling', 'bike', 'Cycle']];

// Travel mode, endpoints, algorithm picker and the two action buttons.
export default function PlannerForm({
  mode, onMode, source, destination, onSource, onDestination, onSwap, setPickTarget,
  location, algorithm, onAlgorithm, onSubmit, onCompare, busy, comparing, ready,
}) {
  const canRoute = source && destination && ready && !busy && !comparing;
  return <>
    <div className="mode-tabs" role="group" aria-label="Travel mode">
      {MODES.map(([value, icon, label]) =>
        <button key={value} className={mode === value ? 'selected' : ''} aria-pressed={mode === value} onClick={() => onMode(value)}>
          <Icon name={icon}/>{label}
        </button>)}
    </div>
    <form onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <div className="endpoints">
        <SearchBox label="STARTING POINT" value={source} onChange={onSource} onEdit={location.cancel} onFocus={() => setPickTarget('source')}/>
        <div className="origin-location">
          <button type="button" className="location-button" onClick={location.locate} disabled={location.busy}>
            <Icon name="locate" size={16}/>{location.busy ? 'Locating…' : location.canRetry ? 'Retry GPS' : 'Use my current location'}
          </button>
          <small role="status">{location.message}</small>
        </div>
        <div className="endpoint-connector"/>
        <button type="button" className="swap-button" aria-label="Swap source and destination" onClick={onSwap}><Icon name="swap" size={17}/></button>
        <SearchBox label="DESTINATION" value={destination} onChange={onDestination} onFocus={() => setPickTarget('destination')} destination/>
      </div>

      <div className="algorithm-row">
        <label htmlFor="algorithm">Routing algorithm <span title="The five C++ algorithms use the bundled Delhi graph. Worldwide routing uses OSRM.">ⓘ</span></label>
        <select id="algorithm" value={algorithm} onChange={event => onAlgorithm(event.target.value)}>
          {ALGORITHM_OPTIONS.map(key => <option key={key} value={key}>{ALGORITHMS[key].label}</option>)}
        </select>
      </div>
      {algorithm !== 'world' && <p className="algorithm-hint">{ALGORITHMS[algorithm].summary} <code>{ALGORITHMS[algorithm].complexity}</code></p>}

      <button className="route-button" disabled={!canRoute} type="submit">
        <span>{busy ? 'Finding your way…' : 'Find my route'}</span>
        {busy ? <span className="spinner"/> : <Icon name="arrow" size={21}/>}
      </button>
      <button className="compare-button" type="button" disabled={!canRoute} onClick={onCompare}>
        {comparing ? <><span className="spinner dark"/> Running all five algorithms…</> : <><Icon name="route" size={17}/> Compare all 5 algorithms</>}
      </button>
    </form>
  </>;
}
