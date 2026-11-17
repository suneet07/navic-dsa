// Single entry point that dispatches to the five path-finding algorithms.
#pragma once

#include "navic/algorithms/astar.hpp"
#include "navic/algorithms/bfs.hpp"
#include "navic/algorithms/dfs.hpp"
#include "navic/algorithms/dijkstra.hpp"
#include "navic/algorithms/floyd_warshall.hpp"

#include <array>
#include <string>

namespace navic {

enum class Algorithm { dijkstra, astar, bfs, dfs, floyd_warshall };

const std::array<Algorithm, 5>& all_algorithms();
std::string algorithm_name(Algorithm algorithm);       // "dijkstra", "astar", ...
bool parse_algorithm(const std::string& text, Algorithm& out);

struct RunOptions {
    FloydWarshallOptions floyd;
};

SearchResult run_algorithm(Algorithm algorithm, const Graph& graph, NodeId source, NodeId target,
                           Mode mode, const RunOptions& options = RunOptions());

} // namespace navic
