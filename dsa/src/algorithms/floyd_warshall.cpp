#include "navic/algorithms/floyd_warshall.hpp"

#include <algorithm>
#include <sstream>
#include <unordered_map>
#include <utility>

namespace navic {

std::size_t floyd_warshall_matrix(std::vector<double>& dist, std::vector<int>& next, int n) {
    std::size_t relaxations = 0;
    for (int k = 0; k < n; ++k) {
        const double* row_k = &dist[static_cast<std::size_t>(k) * n];
        for (int i = 0; i < n; ++i) {
            double* row_i = &dist[static_cast<std::size_t>(i) * n];
            const double dik = row_i[k];
            if (dik == kInfinity) continue; // nothing to gain through k
            int* next_i = &next[static_cast<std::size_t>(i) * n];
            const int hop = next_i[k];
            relaxations += static_cast<std::size_t>(n);
            for (int j = 0; j < n; ++j) {
                const double through_k = dik + row_k[j];
                if (through_k < row_i[j]) {
                    row_i[j] = through_k;
                    next_i[j] = hop; // to reach j, first go where we'd go to reach k
                }
            }
        }
    }
    return relaxations;
}

std::vector<int> floyd_warshall_path(const std::vector<int>& next, int n, int from, int to) {
    std::vector<int> path;
    if (from != to && next[static_cast<std::size_t>(from) * n + to] < 0) return path;
    path.push_back(from);
    for (int at = from; at != to;) {
        at = next[static_cast<std::size_t>(at) * n + to];
        if (at < 0 || static_cast<int>(path.size()) > n) return std::vector<int>();
        path.push_back(at);
    }
    return path;
}

namespace {

// Picks the corridor: every usable node ranked by how much detour it adds.
std::vector<NodeId> corridor_nodes(const Graph& graph, NodeId source, NodeId target, Mode mode, std::size_t limit) {
    const Point s = graph.nodes[source].point;
    const Point t = graph.nodes[target].point;
    const double direct = haversine(s, t);
    const double slack = std::max(1000.0, direct); // ignore nodes far outside the corridor

    std::vector<std::pair<double, NodeId>> ranked;
    for (NodeId i = 0; i < graph.nodes.size(); ++i) {
        const Node& node = graph.nodes[i];
        if (!((node.out_modes | node.in_modes) & mode_bit(mode))) continue;
        const double detour = haversine(s, node.point) + haversine(node.point, t) - direct;
        if (detour <= slack) ranked.push_back({detour, i});
    }
    if (ranked.size() > limit) {
        std::nth_element(ranked.begin(), ranked.begin() + static_cast<std::ptrdiff_t>(limit), ranked.end());
        ranked.resize(limit);
    }

    std::vector<NodeId> nodes;
    nodes.reserve(ranked.size() + 2);
    nodes.push_back(source);
    if (target != source) nodes.push_back(target);
    for (const auto& item : ranked)
        if (item.second != source && item.second != target) nodes.push_back(item.second);
    if (nodes.size() > limit) nodes.resize(limit);
    return nodes;
}

// Shortest allowed edge u -> v (parallel edges are possible in OSM data).
EdgeId best_edge(const Graph& graph, NodeId u, NodeId v, Mode mode) {
    EdgeId best = kNone;
    for (EdgeId id : graph.nodes[u].outgoing) {
        if (graph.edges[id].to != v || !graph.edge_allows(id, mode)) continue;
        if (best == kNone || graph.edges[id].length < graph.edges[best].length) best = id;
    }
    return best;
}

} // namespace

SearchResult floyd_warshall(const Graph& graph, NodeId source, NodeId target, Mode mode,
                            const FloydWarshallOptions& options) {
    Stopwatch timer;
    SearchResult result;

    const std::vector<NodeId> sub = corridor_nodes(graph, source, target, mode, std::max<std::size_t>(2, options.max_nodes));
    const int n = static_cast<int>(sub.size());
    std::unordered_map<NodeId, int> local;
    local.reserve(sub.size() * 2);
    for (int i = 0; i < n; ++i) local[sub[i]] = i;

    // Build the adjacency matrix of the induced sub-graph.
    std::vector<double> dist(static_cast<std::size_t>(n) * n, kInfinity);
    std::vector<int> next(static_cast<std::size_t>(n) * n, -1);
    for (int i = 0; i < n; ++i) {
        dist[static_cast<std::size_t>(i) * n + i] = 0;
        next[static_cast<std::size_t>(i) * n + i] = i;
        for (EdgeId id : graph.nodes[sub[i]].outgoing) {
            if (!graph.edge_allows(id, mode)) continue;
            const auto found = local.find(graph.edges[id].to);
            if (found == local.end()) continue;
            const std::size_t cell = static_cast<std::size_t>(i) * n + found->second;
            if (graph.edges[id].length < dist[cell]) {
                dist[cell] = graph.edges[id].length;
                next[cell] = found->second;
            }
        }
    }

    result.relaxations = floyd_warshall_matrix(dist, next, n);
    result.visited = sub.size();
    result.visit_order = sub;

    const std::vector<int> hops = floyd_warshall_path(next, n, 0, local[target]);
    if (!hops.empty()) {
        result.found = true;
        for (std::size_t i = 1; i < hops.size(); ++i)
            result.edges.push_back(best_edge(graph, sub[hops[i - 1]], sub[hops[i]], mode));
        measure_path(graph, mode, result);
    }

    std::ostringstream note;
    note << "All-pairs shortest paths on a " << n << "-node corridor (" << n << "x" << n
         << " matrix). Optimal within the corridor; O(V^3) makes the full 300k-node graph infeasible.";
    result.note = note.str();
    result.search_ms = timer.elapsed_ms();
    return result;
}

} // namespace navic
