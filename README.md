# Navic — MERN route planner with a C++ algorithms engine

**Live:** https://navic-dsa.vercel.app · every push to `main` deploys automatically on Vercel.

Plan driving, walking and cycling routes anywhere in the world, and watch five classic graph
algorithms — **Dijkstra, A\*, BFS, DFS and Floyd–Warshall** — race across a real 309,697-node
OpenStreetMap road graph of Delhi.

Rebuilt from [sourcestik/navic-MiniProject](https://github.com/sourcestik/navic-MiniProject):
same frontend and data, now on the **MERN stack**, with every algorithm written in **C++**.

```
React (Vite + Leaflet)  ──HTTP──▶  Express (Node.js)  ──stdin/stdout──▶  C++ engine (graph in RAM)
        frontend/                     backend/            │                    dsa/
                                         ├──▶ MongoDB  (places, route history)
                                         └──▶ OSRM / Photon  (worldwide routing & search)
```

## Folder structure

```
navic-miniproject-final/
├── dsa/                         C++ — all graph algorithms (no web code here)
│   ├── include/navic/
│   │   ├── algorithms/          dijkstra.hpp  astar.hpp  bfs.hpp  dfs.hpp  floyd_warshall.hpp
│   │   ├── graph.hpp            adjacency-list road graph
│   │   ├── union_find.hpp       DSU for connected components
│   │   ├── search_result.hpp    common result type + path reconstruction
│   │   ├── snapping.hpp         lat/lon → nearest usable node
│   │   ├── route_builder.hpp    path → GeoJSON + turn-by-turn steps
│   │   ├── json_writer.hpp      tiny JSON serialiser
│   │   └── engine.hpp           stdin/stdout protocol used by the backend
│   ├── src/                     implementations (same layout as include/)
│   ├── tests/test_algorithms.cpp  randomised cross-checks of all five algorithms
│   └── Makefile
├── backend/                     Express + Mongoose
│   ├── src/
│   │   ├── config/              env.js, db.js
│   │   ├── engine/              EngineClient.js — spawns & talks to the C++ engine
│   │   ├── models/              Place.js, RouteHistory.js
│   │   ├── services/            routing, places, history, OSRM, Photon
│   │   ├── controllers/         one per resource
│   │   ├── routes/index.js      all /api routes
│   │   ├── middleware/          validation, CORS + rate limit, error handler
│   │   ├── app.js  server.js
│   ├── scripts/                 prepare-data.js, seed-places.js
│   └── test/api.test.js
├── frontend/                    React
│   └── src/
│       ├── api/                 client.js (fetch wrapper), navic.js (endpoints)
│       ├── components/          Header, PlannerForm, SearchBox, MapView, RouteResult, ComparePanel, ...
│       ├── hooks/               useApiHealth, useCurrentLocation
│       ├── constants/           algorithms.js (labels, colours, complexity)
│       ├── utils/               format.js, location.js
│       └── App.jsx  main.jsx  styles.css
├── data/                        OSM graph snapshot (graph.ndjson.gz), offline road GeoJSON
└── scripts/build-dsa.js         runs make / mingw32-make
```

## The five algorithms (`dsa/src/algorithms/`)

| Algorithm | Data structure | Time | Optimal? | What the app shows |
|---|---|---|---|---|
| Dijkstra | binary min-heap (`priority_queue`) | O((V+E) log V) | ✅ shortest distance | baseline: explores a big circle |
| A\* | min-heap ordered by g + h (haversine) | O((V+E) log V) | ✅ (heuristic is admissible) | same route, ~10× fewer nodes |
| BFS | `queue` | O(V+E) | fewest *segments*, not metres | slightly longer route |
| DFS | explicit `stack` (iterative) | O(V+E) | ❌ any path | wandering route, very few nodes |
| Floyd–Warshall | n×n distance + next-hop matrices | O(V³) | ✅ inside its corridor | runs on ≤1,500-node corridor |

**Why Floyd–Warshall uses a corridor:** the full graph has 309k nodes, so the V×V matrix would need
~700 GB and V³ ≈ 3×10¹⁶ steps. The engine instead picks the ≤1,500 nodes with the smallest detour
`d(s,n) + d(n,t) − d(s,t)` (an ellipse around the trip), runs textbook Floyd–Warshall on that
sub-graph and reads the s→t answer. Works for trips up to ~3 km (NSUT → Vegas Mall takes ~0.4 s);
longer trips return a clear `FLOYD_CORRIDOR_TOO_SMALL` error.

Other DSA used: adjacency lists, Union-Find (component labelling for snapping), LRU cache (backend).

## Requirements

- **Node.js 20+** and npm
- **A C++14 compiler + make**: Windows → MinGW (`g++`, `mingw32-make`); Linux → `build-essential`; macOS → Xcode CLT
- **MongoDB** (optional): local `mongod` or a free MongoDB Atlas cluster. Without it the app still
  works — place search uses a JSON file and route history is disabled.

## Setup (once)

```bash
npm run setup
```

That installs backend + frontend packages, compiles the C++ engine (`dsa/build/navic-engine`) and
converts `data/graph.ndjson.gz` into `data/generated/graph.txt` + `places.json`.

Optional MongoDB:

```bash
cp backend/.env.example backend/.env
```

Set `MONGO_URI` in `backend/.env`, then load the 19,907 Delhi places:

```bash
npm --prefix backend run seed
```

## Run (development)

Two terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Open http://127.0.0.1:5173 . Vite proxies `/api` to Express on port 5000.

## Run (production-style, one server)

```bash
npm run build
```

```bash
npm start
```

Open http://localhost:5000 — Express serves both the API and the built React app.

## Tests

```bash
npm test
```

Runs the C++ suite (5,579 checks: A\* and Floyd–Warshall must equal Dijkstra on random graphs,
BFS must use the fewest hops, every path must be a valid edge chain), the backend API tests
(real Express + real engine on the Delhi graph) and the frontend location tests.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | engine + database status, graph size |
| GET | `/api/coverage` | bounding box, modes, algorithms |
| GET | `/api/geocode?q=&limit=&scope=local` | place search (Photon + local gazetteer) |
| GET | `/api/reverse-geocode?lat=&lon=` | nearest named place |
| POST | `/api/route` | `{source, destination, mode, algorithm}` — `algorithm`: `world`, `dijkstra`, `astar`, `bfs`, `dfs`, `floyd` |
| POST | `/api/route/compare` | runs all five C++ algorithms on the same trip |
| GET / DELETE | `/api/history` | recent routes from MongoDB |
| GET | `/api/network` | offline Delhi road GeoJSON |

```bash
curl -s http://localhost:5000/api/route -H "Content-Type: application/json" -d "{\"source\":{\"lat\":28.6109714,\"lon\":77.037946},\"destination\":{\"lat\":28.6010845,\"lon\":77.0296006},\"mode\":\"driving\",\"algorithm\":\"astar\"}"
```

You can also talk to the C++ engine directly, without Node:

```bash
dsa/build/navic-engine data/generated/graph.txt --once "1 route dijkstra driving 28.6109714 77.037946 28.6010845 77.0296006 0"
```

## How Node and C++ talk

`backend/src/engine/EngineClient.js` spawns the engine once at startup. The engine loads the graph
(~2.5 s), prints `{"ready":true}`, then reads one request per line from stdin, e.g.
`7 route astar driving 28.61 77.03 28.60 77.02 2500`, and writes one JSON line back
(`{"id":7,"ok":true,"result":{...}}`). Requests carry ids so responses are matched correctly;
the client times out slow requests and restarts the engine if it crashes.

## Notes and limits

- Local routes minimise distance; ETAs use fixed speeds with no traffic. Turn restrictions are not modelled.
- Worldwide routing and search use the free public OSRM (FOSSGIS) and Photon services — please don't hammer them.
- Map data © OpenStreetMap contributors, ODbL.
