#pragma once

#include "navic/search_result.hpp"

#include <cstddef>
#include <vector>

namespace navic {

// Classic all-pairs Floyd–Warshall on a dense n x n matrix (row-major).
//   dist[i*n+j]  in: direct edge weight (or kInfinity), 0 on the diagonal
//                out: shortest distance i -> j
//   next[i*n+j]  in: j if a direct edge exists, otherwise -1
//                out: first hop on the shortest path i -> j (-1 if unreachable)
// Time O(n^3), space O(n^2). Returns the number of (i, j, k) relaxations tried.
std::size_t floyd_warshall_matrix(std::vector<double>& dist, std::vector<int>& next, int n);

// Rebuilds the node sequence i -> j from the `next` matrix. Empty if unreachable.
std::vector<int> floyd_warshall_path(const std::vector<int>& next, int n, int from, int to);

struct FloydWarshallOptions {
    std::size_t max_nodes = 1500; // O(n^3): 1500 nodes ≈ 3.4e9 relaxations worst case
};

// Point-to-point route using Floyd–Warshall. Running it on 300k nodes would need
// ~700 GB of RAM, so we first cut out an elliptical corridor around the source
// and target (nodes with the smallest detour d(s,n) + d(n,t) - d(s,t)), keep at
// most `max_nodes` of them, run all-pairs shortest paths on that sub-graph and
// read off the s -> t answer.
SearchResult floyd_warshall(const Graph& graph, NodeId source, NodeId target, Mode mode,
                            const FloydWarshallOptions& options = FloydWarshallOptions());

} // namespace navic
