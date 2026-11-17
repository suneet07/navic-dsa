// Integration tests: real Express app + real C++ engine on the Delhi graph.
// Requires `npm run prepare-data` and a built engine (dsa/build/navic-engine).
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { engine } from '../src/engine/index.js';

const NSUT = { lat: 28.6109714, lon: 77.037946 };
const VEGAS = { lat: 28.6010845, lon: 77.0296006 };
let server;
let base;

before(async () => {
  await engine.start();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => { server?.close(); engine.stop(); });

const post = (path, body) => fetch(base + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).then(async res => ({ status: res.status, body: await res.json() }));

test('health reports the loaded graph', async () => {
  const body = await (await fetch(`${base}/health`)).json();
  assert.equal(body.status, 'ok');
  assert.ok(body.nodes > 100000);
});

test('optimal algorithms agree; BFS/DFS are never shorter', async () => {
  const results = {};
  for (const algorithm of ['dijkstra', 'astar', 'bfs', 'dfs', 'floyd']) {
    const { status, body } = await post('/route', { source: NSUT, destination: VEGAS, mode: 'driving', algorithm });
    assert.equal(status, 200, `${algorithm}: ${JSON.stringify(body.error)}`);
    assert.equal(body.provider, 'navic');
    assert.ok(body.geometry.coordinates.length >= 2);
    results[algorithm] = body;
  }
  const best = results.dijkstra.distance_m;
  assert.ok(Math.abs(results.astar.distance_m - best) < 0.01);
  assert.ok(Math.abs(results.floyd.distance_m - best) < 0.01);
  assert.ok(results.bfs.distance_m >= best && results.dfs.distance_m >= best);
  assert.ok(results.astar.visited_nodes < results.dijkstra.visited_nodes);
  assert.ok(results.bfs.hops <= results.dijkstra.hops);
});

test('compare returns all five algorithms', async () => {
  const { status, body } = await post('/route/compare', { source: NSUT, destination: VEGAS, mode: 'walking' });
  assert.equal(status, 200);
  assert.deepEqual(body.results.map(r => r.algorithm), ['dijkstra', 'astar', 'bfs', 'dfs', 'floyd']);
});

test('Floyd–Warshall refuses trips too long for its corridor', async () => {
  const { status, body } = await post('/route', {
    source: NSUT, destination: { lat: 28.6129, lon: 77.2295 }, mode: 'driving', algorithm: 'floyd',
  });
  assert.equal(status, 422);
  assert.equal(body.error.code, 'FLOYD_CORRIDOR_TOO_SMALL');
});

test('validation errors use the standard error shape', async () => {
  const bad = await post('/route', { source: { lat: 'x' }, destination: VEGAS });
  assert.equal(bad.status, 422);
  assert.equal(bad.body.error.code, 'INVALID_COORDINATE');
  const algo = await post('/route', { source: NSUT, destination: VEGAS, algorithm: 'bellman' });
  assert.equal(algo.body.error.code, 'INVALID_ALGORITHM');
});

test('local place search finds NSUT', async () => {
  const body = await (await fetch(`${base}/geocode?q=NSUT&scope=local`)).json();
  assert.match(body.results[0].name, /Netaji Subhas/);
});
