// Line-based command protocol between the Node.js backend and the C++ engine.
//
// Request  (one line on stdin):   <id> <command> [args...]
//   <id> ping
//   <id> info
//   <id> route   <algorithm> <mode> <src_lat> <src_lon> <dst_lat> <dst_lon> [explore_limit]
//   <id> compare <mode> <src_lat> <src_lon> <dst_lat> <dst_lon> [explore_limit]
//
// Response (one line on stdout):  {"id":<id>,"ok":true,"result":{...}}
//                              or {"id":<id>,"ok":false,"error":{"status":..,"code":..,"message":..}}
#pragma once

#include "navic/algorithms.hpp"
#include "navic/graph.hpp"

#include <stdexcept>
#include <string>

namespace navic {

struct EngineError : std::runtime_error {
    int status;
    std::string code;
    EngineError(int status_, std::string code_, const std::string& message)
        : std::runtime_error(message), status(status_), code(std::move(code_)) {}
};

struct EngineOptions {
    double snap_limit_m = 800;
    std::size_t default_explore_limit = 2500;
    RunOptions run;
};

class Engine {
public:
    Engine(Graph graph, EngineOptions options);

    // Handles one request line and always returns exactly one JSON line.
    std::string handle(const std::string& line);

    const Graph& graph() const { return graph_; }

private:
    std::string info() const;
    std::string route(std::istream& args);
    std::string compare(std::istream& args);

    Graph graph_;
    EngineOptions options_;
};

} // namespace navic
