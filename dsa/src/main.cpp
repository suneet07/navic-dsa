// navic-engine: loads the road graph once, then answers routing requests
// line-by-line on stdin/stdout. Spawned and managed by the Express backend.
//
// Usage:
//   navic-engine <graph.txt> [--floyd-max-nodes N]
//   navic-engine <graph.txt> --once "1 route astar driving 28.61 77.03 28.60 77.02"
#include "navic/engine.hpp"

#include <cstdlib>
#include <iostream>
#include <string>

namespace {

void print_usage() {
    std::cerr << "Usage: navic-engine <graph.txt> [--floyd-max-nodes N] [--once \"<request>\"]\n";
}

} // namespace

int main(int argc, char** argv) {
    std::ios::sync_with_stdio(false);
    if (argc < 2) { print_usage(); return 2; }

    navic::EngineOptions options;
    std::string once;
    for (int i = 2; i < argc; ++i) {
        const std::string arg = argv[i];
        if (arg == "--floyd-max-nodes" && i + 1 < argc) {
            const long value = std::strtol(argv[++i], nullptr, 10);
            if (value < 2 || value > 3000) { std::cerr << "--floyd-max-nodes must be 2..3000\n"; return 2; }
            options.run.floyd.max_nodes = static_cast<std::size_t>(value);
        } else if (arg == "--once" && i + 1 < argc) {
            once = argv[++i];
        } else {
            print_usage();
            return 2;
        }
    }

    try {
        navic::Stopwatch timer;
        navic::Graph graph = navic::Graph::load(argv[1]);
        navic::Engine engine(std::move(graph), options);
        std::cerr << "navic-engine: loaded " << engine.graph().nodes.size() << " nodes, " << engine.graph().edges.size()
                  << " edges in " << static_cast<long>(timer.elapsed_ms()) << " ms\n";

        if (!once.empty()) {
            std::cout << engine.handle(once) << std::endl;
            return 0;
        }

        // Handshake line so the backend knows the graph is in memory.
        std::cout << "{\"ready\":true}" << std::endl;
        std::string line;
        while (std::getline(std::cin, line)) {
            if (!line.empty() && line.back() == '\r') line.pop_back();
            if (line.empty()) continue;
            std::cout << engine.handle(line) << std::endl; // endl flushes: the backend waits on each line
        }
    } catch (const std::exception& error) {
        std::cerr << "navic-engine: fatal: " << error.what() << '\n';
        return 1;
    }
    return 0;
}
