// Randomised correctness tests for the five algorithms.
// Build & run:  make test   (from the dsa/ folder)
#include "navic/algorithms.hpp"
#include "navic/json_writer.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <random>
#include <string>

using namespace navic;

namespace {

int failures = 0;
int checks = 0;

void expect(bool condition, const std::string& message) {
    ++checks;
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << message << '\n';
    }
}

bool near(double a, double b) { return std::abs(a - b) < 1e-6 * std::max(1.0, std::abs(a)); }

// Small random graph packed into ~110 m so the Floyd–Warshall corridor covers it all.
Graph random_graph(std::mt19937& rng, int n, int m) {
    Graph g;
    g.names.push_back("Test road");
    std::uniform_real_distribution<double> offset(0.0, 0.001);
    for (int i = 0; i < n; ++i) g.add_node(i, Point{28.6 + offset(rng), 77.0 + offset(rng)});
    std::uniform_int_distribution<int> pick(0, n - 1);
    std::uniform_real_distribution<double> stretch(1.0, 3.0);
    std::uniform_int_distribution<int> modes(1, 7);
    for (int i = 0; i < m; ++i) {
        Edge e;
        e.from = static_cast<NodeId>(pick(rng));
        e.to = static_cast<NodeId>(pick(rng));
        e.length = haversine(g.nodes[e.from].point, g.nodes[e.to].point) * stretch(rng);
        e.seconds = {{e.length / 10, e.length / 1.4, e.length / 4}};
        e.modes = modes(rng);
        g.add_edge(e);
    }
    g.index_components();
    return g;
}

// A path is valid if its edges chain from source to target and allow the mode.
bool valid_path(const Graph& g, const SearchResult& r, NodeId s, NodeId t, Mode mode) {
    NodeId at = s;
    for (EdgeId id : r.edges) {
        if (g.edges[id].from != at || !g.edge_allows(id, mode)) return false;
        at = g.edges[id].to;
    }
    return at == t;
}

void test_matrix_floyd() {
    // 0 ->1 (4), 0->2 (1), 2->1 (2), 1->3 (1)  => d(0,3) = 4 via 0-2-1-3
    const int n = 4;
    std::vector<double> d(n * n, kInfinity);
    std::vector<int> next(n * n, -1);
    for (int i = 0; i < n; ++i) { d[i * n + i] = 0; next[i * n + i] = i; }
    auto edge = [&](int a, int b, double w) { d[a * n + b] = w; next[a * n + b] = b; };
    edge(0, 1, 4); edge(0, 2, 1); edge(2, 1, 2); edge(1, 3, 1);
    floyd_warshall_matrix(d, next, n);
    expect(near(d[0 * n + 3], 4), "Floyd matrix distance 0->3 should be 4");
    const std::vector<int> path = floyd_warshall_path(next, n, 0, 3);
    expect(path == std::vector<int>({0, 2, 1, 3}), "Floyd matrix path should be 0-2-1-3");
    expect(d[3 * n + 0] == kInfinity && floyd_warshall_path(next, n, 3, 0).empty(), "3->0 is unreachable");
}

void test_random_graphs() {
    std::mt19937 rng(20261117);
    RunOptions options;
    options.floyd.max_nodes = 1000;
    for (int round = 0; round < 150; ++round) {
        const int n = 5 + round % 60;
        const Graph g = random_graph(rng, n, n * 3);
        std::uniform_int_distribution<int> pick(0, n - 1);
        for (int q = 0; q < 6; ++q) {
            const NodeId s = static_cast<NodeId>(pick(rng)), t = static_cast<NodeId>(pick(rng));
            const Mode mode = static_cast<Mode>(q % 3);
            const SearchResult dj = dijkstra(g, s, t, mode);
            const SearchResult as = astar(g, s, t, mode);
            const SearchResult fw = floyd_warshall(g, s, t, mode, options.floyd);
            const SearchResult bf = bfs(g, s, t, mode);
            const SearchResult df = dfs(g, s, t, mode);
            const std::string tag = " (round " + std::to_string(round) + ")";

            expect(as.found == dj.found && fw.found == dj.found && bf.found == dj.found && df.found == dj.found,
                   "all algorithms agree on reachability" + tag);
            if (!dj.found) continue;
            expect(near(as.distance, dj.distance), "A* distance equals Dijkstra" + tag);
            expect(near(fw.distance, dj.distance), "Floyd–Warshall distance equals Dijkstra" + tag);
            expect(bf.distance + 1e-9 >= dj.distance, "BFS is never shorter than Dijkstra" + tag);
            expect(df.distance + 1e-9 >= dj.distance, "DFS is never shorter than Dijkstra" + tag);
            expect(bf.edges.size() <= dj.edges.size() && bf.edges.size() <= df.edges.size(),
                   "BFS uses the fewest hops" + tag);
            expect(as.visited <= dj.visited, "A* expands no more nodes than Dijkstra" + tag);
            for (const SearchResult* r : {&dj, &as, &fw, &bf, &df})
                expect(valid_path(g, *r, s, t, mode), "path edges form a valid chain" + tag);
        }
    }
}

void test_json_writer() {
    JsonWriter json;
    json.begin_object().field("name", std::string("Ring \"Road\"\n")).key("list").begin_array()
        .value(1).value(2.5).value(true).end_array().end_object();
    expect(json.str() == "{\"name\":\"Ring \\\"Road\\\"\\n\",\"list\":[1,2.5,true]}", "JSON writer output: " + json.str());
}

} // namespace

int main() {
    test_matrix_floyd();
    test_json_writer();
    test_random_graphs();
    std::cout << checks - failures << "/" << checks << " checks passed\n";
    return failures == 0 ? EXIT_SUCCESS : EXIT_FAILURE;
}
