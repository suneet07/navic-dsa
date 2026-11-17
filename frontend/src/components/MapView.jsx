import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getNetwork } from '../api/navic';
import { ALGORITHMS } from '../constants/algorithms';
import { Icon } from './Icon';

const tileUrl = import.meta.env.VITE_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const toLatLngs = geometry => geometry.coordinates.map(([lon, lat]) => [lat, lon]);

// Leaflet map: endpoint pins, the chosen route, explored nodes and comparison overlays.
export default function MapView({ source, destination, route, comparison, showExplored, onPick, pickTarget, offline, setOffline }) {
  const container = useRef(null), map = useRef(null), tile = useRef(null);
  const routeLayers = useRef(null), exploredLayer = useRef(null), markers = useRef(null), roads = useRef(null);
  const pickRef = useRef(onPick);
  const fitted = useRef(null);
  const [mapError, setMapError] = useState('');
  useEffect(() => { pickRef.current = onPick; }, [onPick]);

  // Create the map once.
  useEffect(() => {
    const instance = L.map(container.current, { zoomControl: false, preferCanvas: true, minZoom: 2, worldCopyJump: true }).setView([20, 0], 2);
    map.current = instance;
    tile.current = L.tileLayer(tileUrl, { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(instance);
    tile.current.on('tileerror', () => setMapError('Map tiles unavailable. Use the offline road map.'));
    exploredLayer.current = L.layerGroup().addTo(instance);
    routeLayers.current = L.layerGroup().addTo(instance);
    markers.current = L.layerGroup().addTo(instance);
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(instance);
    instance.on('click', event => {
      const lon = event.latlng.wrap().lng;
      pickRef.current({ lat: event.latlng.lat, lon, name: `${event.latlng.lat.toFixed(5)}, ${lon.toFixed(5)}` });
    });
    const observer = new ResizeObserver(() => {
      instance.invalidateSize({ pan: false });
      if (fitted.current) frameRoute(instance, fitted.current);
    });
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (source && map.current) map.current.setView([source.lat, source.lon], source.method === 'ip' ? 10 : 13);
  }, [source]);

  // Endpoint pins.
  useEffect(() => {
    if (!map.current) return;
    markers.current.clearLayers();
    for (const [place, letter, color] of [[source, 'A', '#245847'], [destination, 'B', '#c17a27']]) {
      if (!place) continue;
      const icon = L.divIcon({ className: 'place-pin', html: `<span style="background:${color}">${letter}</span>`, iconSize: [32, 42], iconAnchor: [16, 40] });
      const marker = L.marker([place.lat, place.lon], { icon, title: place.name }).addTo(markers.current);
      const label = document.createElement('span'); label.textContent = place.name; marker.bindTooltip(label);
    }
  }, [source, destination]);

  // Route line(s): either the single chosen route or every algorithm from a comparison.
  useEffect(() => {
    if (!map.current) return;
    routeLayers.current.clearLayers();
    fitted.current = null;
    const lines = comparison
      ? comparison.results.filter(r => r.found).map(r => ({ geometry: r.geometry, color: ALGORITHMS[r.algorithm].color, name: ALGORITHMS[r.algorithm].short }))
      : route ? [{ geometry: route.geometry, color: route.provider === 'osrm' ? '#275d48' : ALGORITHMS[route.algorithm]?.color || '#275d48' }] : [];
    if (!lines.length) return;

    const bounds = L.latLngBounds([]);
    lines.forEach((line, i) => {
      const latlngs = toLatLngs(line.geometry);
      // In a comparison each later line is thinner, so overlapping paths stay visible as nested stripes.
      const weight = comparison ? 9 - i * 1.6 : 5;
      if (!comparison || i === 0) L.polyline(latlngs, { color: '#ffffff', weight: weight + 5, opacity: .9 }).addTo(routeLayers.current);
      const polyline = L.polyline(latlngs, { color: line.color, weight, opacity: 1, dashArray: comparison && line.name === 'DFS' ? '8 6' : null }).addTo(routeLayers.current);
      if (line.name) polyline.bindTooltip(line.name, { sticky: true });
      bounds.extend(polyline.getBounds());
    });
    const snapped = (comparison?.results[0] || route)?.snapped;
    for (const [original, snap] of [[source, snapped?.source], [destination, snapped?.destination]]) {
      if (original && snap && snap.distance_m > 5) L.polyline([[original.lat, original.lon], [snap.lat, snap.lon]],
        { color: '#9b733f', weight: 2, dashArray: '4 6', interactive: false }).addTo(routeLayers.current);
    }
    for (const place of [source, destination]) if (place) bounds.extend([place.lat, place.lon]);
    fitted.current = bounds;
    frameRoute(map.current, bounds);
  }, [route, comparison, source, destination]);

  // Explored nodes: shows how far the search spread before reaching the target.
  useEffect(() => {
    if (!map.current) return;
    exploredLayer.current.clearLayers();
    if (!showExplored || comparison || !route?.explored?.length) return;
    const color = ALGORITHMS[route.algorithm]?.color || '#275d48';
    for (const [lon, lat] of route.explored)
      L.circleMarker([lat, lon], { radius: 2, stroke: false, fillColor: color, fillOpacity: .35, interactive: false }).addTo(exploredLayer.current);
  }, [route, comparison, showExplored]);

  // Offline road backdrop (bundled GeoJSON) instead of internet tiles.
  useEffect(() => {
    if (!map.current) return;
    const controller = new AbortController();
    if (!offline) { roads.current?.remove(); tile.current.addTo(map.current); return; }
    tile.current.remove(); setMapError('');
    if (roads.current) roads.current.addTo(map.current);
    else getNetwork(controller.signal).then(data => {
      if (controller.signal.aborted || !map.current) return;
      roads.current = L.geoJSON(data, { style: { color: '#aebbad', weight: 1.5, opacity: .75 }, interactive: false });
      roads.current.addTo(map.current).bringToBack();
    }).catch(error => { if (!controller.signal.aborted) setMapError(error.message); });
    return () => controller.abort();
  }, [offline]);

  return <section id="route-map" tabIndex={-1} className="map-area" aria-label="Interactive route map">
    <div ref={container} className="map-canvas" />
    <div className="map-topline">
      <span className="map-location"><span className="live-dot"/> WORLD MAP</span>
      <button className={`map-style ${offline ? 'selected' : ''}`} onClick={() => setOffline(!offline)} aria-pressed={offline}>
        <Icon name="layers" size={17}/>{offline ? 'Delhi offline roads' : 'Online map'}
      </button>
    </div>
    {!route && !comparison && <div className="map-instruction"><Icon name="pin" size={16}/> Click the map to set your <strong>{pickTarget}</strong></div>}
    {comparison && <div className="map-legend" aria-label="Algorithm colours">
      {comparison.results.map(r => <span key={r.algorithm} className={r.found ? '' : 'missing'}>
        <i style={{ background: ALGORITHMS[r.algorithm].color }}/>{ALGORITHMS[r.algorithm].short}</span>)}
    </div>}
    {mapError && <div className="map-error" role="status">{mapError} {!offline && <button onClick={() => setOffline(true)}>Use offline roads</button>}</div>}
    <div className="map-caption"><Icon name="compass" size={15}/><span>{offline ? 'Delhi offline roads · no map-tile connection needed' : 'Worldwide routing · © OpenStreetMap contributors'}</span></div>
    {offline && <div className="offline-attribution">© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · ODbL</div>}
  </section>;
}

// Leave space for map controls while keeping both endpoint pins in view.
function frameRoute(map, bounds) {
  const { x, y } = map.getSize();
  if (!x || !y || !bounds.isValid()) return;
  const side = Math.min(70, x * 0.09);
  map.fitBounds(bounds, {
    paddingTopLeft: [side, Math.min(95, y * 0.24)],
    paddingBottomRight: [side, Math.min(80, y * 0.22)],
    maxZoom: 16,
    animate: false,
  });
}
