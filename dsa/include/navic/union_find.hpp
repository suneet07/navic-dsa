// Disjoint Set Union (union by rank + path compression).
// Used to label weakly connected road components so that snapping can pick
// source/destination nodes that are actually on the same network.
#pragma once

#include <cstddef>
#include <vector>

namespace navic {

class UnionFind {
public:
    explicit UnionFind(std::size_t size = 0);

    std::size_t find(std::size_t x);
    bool unite(std::size_t a, std::size_t b);
    std::size_t size() const { return parent_.size(); }

private:
    std::vector<std::size_t> parent_;
    std::vector<unsigned> rank_;
};

} // namespace navic
