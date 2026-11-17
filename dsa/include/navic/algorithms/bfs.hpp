#pragma once

#include "navic/search_result.hpp"

namespace navic {

// Breadth-First Search. Ignores edge weights and finds the path with the
// fewest road segments (hops). Not distance-optimal. Time O(V + E).
SearchResult bfs(const Graph& graph, NodeId source, NodeId target, Mode mode);

} // namespace navic
