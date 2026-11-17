#include "navic/algorithms.hpp"

namespace navic {

const std::array<Algorithm, 5>& all_algorithms() {
    static const std::array<Algorithm, 5> list = {
        {Algorithm::dijkstra, Algorithm::astar, Algorithm::bfs, Algorithm::dfs, Algorithm::floyd_warshall}};
    return list;
}

std::string algorithm_name(Algorithm algorithm) {
    switch (algorithm) {
        case Algorithm::dijkstra: return "dijkstra";
        case Algorithm::astar: return "astar";
        case Algorithm::bfs: return "bfs";
        case Algorithm::dfs: return "dfs";
        case Algorithm::floyd_warshall: return "floyd";
    }
    return "unknown";
}

bool parse_algorithm(const std::string& text, Algorithm& out) {
    for (Algorithm a : all_algorithms()) {
        if (algorithm_name(a) == text) { out = a; return true; }
    }
    return false;
}

SearchResult run_algorithm(Algorithm algorithm, const Graph& graph, NodeId source, NodeId target,
                           Mode mode, const RunOptions& options) {
    switch (algorithm) {
        case Algorithm::dijkstra: return dijkstra(graph, source, target, mode);
        case Algorithm::astar: return astar(graph, source, target, mode);
        case Algorithm::bfs: return bfs(graph, source, target, mode);
        case Algorithm::dfs: return dfs(graph, source, target, mode);
        case Algorithm::floyd_warshall: return floyd_warshall(graph, source, target, mode, options.floyd);
    }
    return SearchResult();
}

} // namespace navic
