// Directed road graph stored as an adjacency list.
#pragma once

#include "navic/geo.hpp"

#include <array>
#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace navic {

using NodeId = std::size_t;
using EdgeId = std::size_t;

enum class Mode { driving = 0, walking = 1, cycling = 2 };

inline int mode_bit(Mode mode) { return 1 << static_cast<int>(mode); }
inline int mode_index(Mode mode) { return static_cast<int>(mode); }
bool parse_mode(const std::string& text, Mode& out);

struct Node {
    std::int64_t osm_id = 0;
    Point point;
    std::vector<EdgeId> outgoing; // adjacency list: ids into Graph::edges
    int out_modes = 0;            // modes that can leave this node
    int in_modes = 0;             // modes that can arrive at this node
};

struct Edge {
    NodeId from = 0;
    NodeId to = 0;
    double length = 0.0;                // metres (edge weight)
    std::array<double, 3> seconds{};    // travel time per mode
    std::size_t name = 0;               // index into Graph::names
    int modes = 0;                      // bitmask of allowed modes
};

struct BoundingBox {
    double south = 0, west = 0, north = 0, east = 0;
    bool contains(Point p) const {
        return p.lat >= south && p.lat <= north && p.lon >= west && p.lon <= east;
    }
};

class Graph {
public:
    std::vector<Node> nodes;
    std::vector<Edge> edges;
    std::vector<std::string> names;
    BoundingBox bbox;

    // components[mode][node] = representative of the node's weak component.
    std::array<std::vector<NodeId>, 3> components;

    NodeId add_node(std::int64_t osm_id, Point point);
    EdgeId add_edge(Edge edge);
    void index_components();

    // Loads the compact text format produced by backend/scripts/prepare-data.js.
    static Graph load(const std::string& filename);

    bool edge_allows(EdgeId id, Mode mode) const { return (edges[id].modes & mode_bit(mode)) != 0; }
};

} // namespace navic
