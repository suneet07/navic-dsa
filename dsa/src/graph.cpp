#include "navic/graph.hpp"
#include "navic/union_find.hpp"

#include <algorithm>
#include <cctype>
#include <cerrno>
#include <cmath>
#include <cstdlib>
#include <fstream>
#include <sstream>
#include <stdexcept>

namespace navic {

bool parse_mode(const std::string& text, Mode& out) {
    if (text == "driving") { out = Mode::driving; return true; }
    if (text == "walking") { out = Mode::walking; return true; }
    if (text == "cycling") { out = Mode::cycling; return true; }
    return false;
}

NodeId Graph::add_node(std::int64_t osm_id, Point point) {
    if (!std::isfinite(point.lat) || !std::isfinite(point.lon) || std::abs(point.lat) > 90 || std::abs(point.lon) > 180)
        throw std::runtime_error("Invalid node coordinate");
    Node node;
    node.osm_id = osm_id;
    node.point = point;
    nodes.push_back(node);
    return nodes.size() - 1;
}

EdgeId Graph::add_edge(Edge edge) {
    if (edge.from >= nodes.size() || edge.to >= nodes.size() || edge.modes <= 0 || edge.modes > 7 ||
        !std::isfinite(edge.length) || edge.length < 0)
        throw std::runtime_error("Invalid graph edge");
    if (!names.empty() && edge.name >= names.size()) throw std::runtime_error("Invalid road name index");
    for (double t : edge.seconds)
        if (!std::isfinite(t) || t < 0) throw std::runtime_error("Invalid edge travel time");
    // An edge must never be shorter than the straight line between its ends,
    // otherwise the haversine heuristic would overestimate and A* would break.
    edge.length = std::max(edge.length, haversine(nodes[edge.from].point, nodes[edge.to].point));
    const EdgeId id = edges.size();
    nodes[edge.from].outgoing.push_back(id);
    nodes[edge.from].out_modes |= edge.modes;
    nodes[edge.to].in_modes |= edge.modes;
    edges.push_back(edge);
    return id;
}

void Graph::index_components() {
    for (int mode = 0; mode < 3; ++mode) {
        UnionFind dsu(nodes.size());
        for (const Edge& edge : edges)
            if (edge.modes & (1 << mode)) dsu.unite(edge.from, edge.to);
        auto& label = components[mode];
        label.resize(nodes.size());
        for (NodeId i = 0; i < nodes.size(); ++i) label[i] = dsu.find(i);
    }
}

namespace {

// Minimal cursor over the whole file buffer: much faster than iostream >>.
class Reader {
public:
    explicit Reader(const std::string& text) : cursor_(text.c_str()), end_(text.c_str() + text.size()) {}

    double number() {
        skip_space();
        char* stop = nullptr;
        errno = 0;
        const double value = std::strtod(cursor_, &stop);
        if (stop == cursor_ || errno == ERANGE) throw std::runtime_error("Malformed number in graph file");
        cursor_ = stop;
        return value;
    }
    long long integer() {
        skip_space();
        char* stop = nullptr;
        const long long value = std::strtoll(cursor_, &stop, 10);
        if (stop == cursor_) throw std::runtime_error("Malformed integer in graph file");
        cursor_ = stop;
        return value;
    }
    std::string word() {
        skip_space();
        const char* start = cursor_;
        while (cursor_ < end_ && !std::isspace(static_cast<unsigned char>(*cursor_))) ++cursor_;
        return std::string(start, cursor_);
    }
    std::string line() {
        // Consume the remainder of the current line first, then return the next full line.
        const char* start = cursor_;
        while (cursor_ < end_ && *cursor_ != '\n') ++cursor_;
        std::string text(start, cursor_);
        if (cursor_ < end_) ++cursor_;
        if (!text.empty() && text.back() == '\r') text.pop_back();
        return text;
    }
    void finish_line() {
        while (cursor_ < end_ && *cursor_ != '\n') ++cursor_;
        if (cursor_ < end_) ++cursor_;
    }

private:
    void skip_space() {
        while (cursor_ < end_ && std::isspace(static_cast<unsigned char>(*cursor_))) ++cursor_;
    }
    const char* cursor_;
    const char* end_;
};

} // namespace

Graph Graph::load(const std::string& filename) {
    std::ifstream stream(filename, std::ios::binary);
    if (!stream) throw std::runtime_error("Cannot open graph file: " + filename);
    std::stringstream buffer;
    buffer << stream.rdbuf();
    const std::string text = buffer.str();

    Reader in(text);
    if (in.word() != "NAVIC-GRAPH" || in.integer() != 1) throw std::runtime_error("Unsupported graph file format");

    Graph g;
    g.bbox.south = in.number();
    g.bbox.west = in.number();
    g.bbox.north = in.number();
    g.bbox.east = in.number();
    const long long node_count = in.integer();
    const long long edge_count = in.integer();
    const long long name_count = in.integer();
    if (node_count <= 0 || edge_count <= 0 || name_count <= 0 || node_count > 5000000 || edge_count > 10000000)
        throw std::runtime_error("Graph header counts are out of range");

    g.nodes.reserve(static_cast<std::size_t>(node_count));
    for (long long i = 0; i < node_count; ++i) {
        const long long osm = in.integer();
        Point p;
        p.lat = in.number();
        p.lon = in.number();
        g.add_node(osm, p);
    }

    std::vector<Edge> raw;
    raw.reserve(static_cast<std::size_t>(edge_count));
    for (long long i = 0; i < edge_count; ++i) {
        Edge e;
        e.from = static_cast<NodeId>(in.integer());
        e.to = static_cast<NodeId>(in.integer());
        e.length = in.number();
        e.seconds[0] = in.number();
        e.seconds[1] = in.number();
        e.seconds[2] = in.number();
        e.name = static_cast<std::size_t>(in.integer());
        e.modes = static_cast<int>(in.integer());
        raw.push_back(e);
    }

    in.finish_line();
    g.names.reserve(static_cast<std::size_t>(name_count));
    for (long long i = 0; i < name_count; ++i) g.names.push_back(in.line());

    g.edges.reserve(raw.size());
    for (const Edge& e : raw) g.add_edge(e);
    g.index_components();
    return g;
}

} // namespace navic
