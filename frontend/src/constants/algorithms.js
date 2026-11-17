// Display metadata for every routing option. Keys match the backend `algorithm` field.
export const ALGORITHMS = {
  world: {
    label: 'Worldwide routing',
    short: 'OSRM',
    color: '#275d48',
    summary: 'Worldwide directions by OSRM / FOSSGIS on the full OpenStreetMap road network.',
  },
  dijkstra: {
    label: 'Dijkstra · Delhi demo',
    short: 'Dijkstra',
    color: '#275d48',
    complexity: 'O((V + E) log V)',
    summary: 'Expands nodes in order of distance from the start using a min-heap. Always optimal.',
  },
  astar: {
    label: 'A* · Delhi demo',
    short: 'A*',
    color: '#c17a27',
    complexity: 'O((V + E) log V)',
    summary: 'Dijkstra guided by a straight-line (haversine) heuristic. Optimal, explores far fewer nodes.',
  },
  bfs: {
    label: 'BFS · Delhi demo',
    short: 'BFS',
    color: '#3f6fb5',
    complexity: 'O(V + E)',
    summary: 'Level-by-level search with a queue. Finds the fewest road segments, ignoring their lengths.',
  },
  dfs: {
    label: 'DFS · Delhi demo',
    short: 'DFS',
    color: '#b5475a',
    complexity: 'O(V + E)',
    summary: 'Goes deep along one branch with a stack (closest-to-goal neighbour first). Finds a path, not the shortest.',
  },
  floyd: {
    label: 'Floyd–Warshall · short trips',
    short: 'Floyd–Warshall',
    color: '#7a52b3',
    complexity: 'O(V³)',
    summary: 'All-pairs dynamic programming on a corridor of ≤1,500 nodes around the trip. Optimal inside the corridor.',
  },
};

export const LOCAL_ALGORITHMS = ['dijkstra', 'astar', 'bfs', 'dfs', 'floyd'];
export const ALGORITHM_OPTIONS = ['world', ...LOCAL_ALGORITHMS];
