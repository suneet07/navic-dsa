// Common output of every path-finding algorithm plus shared helpers.
#pragma once

#include "navic/graph.hpp"

#include <chrono>
#include <limits>
#include <string>
#include <vector>

namespace navic {

constexpr double kInfinity = std::numeric_limits<double>::infinity();
constexpr std::size_t kNone = std::numeric_limits<std::size_t>::max();

struct SearchResult {
    bool found = false;
    double distance = 0.0;          // metres along the returned path
    double duration = 0.0;          // seconds for the requested mode
    std::size_t visited = 0;        // nodes expanded / settled
    std::size_t relaxations = 0;    // edges (or triples for Floyd–Warshall) examined
    double search_ms = 0.0;         // wall-clock time of the search only
    std::vector<EdgeId> edges;      // path as an ordered list of edge ids
    std::vector<NodeId> visit_order;// order nodes were expanded (for map visualisation)
    std::string note;               // algorithm specific remark
};

// Walks parent_edge[] back from target to source and fills result.edges,
// result.distance and result.duration. Returns false if the chain is broken.
bool reconstruct_path(const Graph& graph, NodeId source, NodeId target,
                      const std::vector<EdgeId>& parent_edge, Mode mode, SearchResult& result);

// Fills distance and duration from an already ordered list of edges.
void measure_path(const Graph& graph, Mode mode, SearchResult& result);

class Stopwatch {
public:
    Stopwatch() : start_(std::chrono::steady_clock::now()) {}
    double elapsed_ms() const {
        return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start_).count();
    }

private:
    std::chrono::steady_clock::time_point start_;
};

} // namespace navic
