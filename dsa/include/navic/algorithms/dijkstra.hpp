#pragma once

#include "navic/search_result.hpp"

namespace navic {

// Dijkstra's algorithm with a binary min-heap (lazy deletion).
// Shortest path by road length. Time O((V + E) log V), space O(V).
SearchResult dijkstra(const Graph& graph, NodeId source, NodeId target, Mode mode);

} // namespace navic
