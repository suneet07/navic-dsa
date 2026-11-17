#include "navic/union_find.hpp"

#include <utility>

namespace navic {

UnionFind::UnionFind(std::size_t size) : parent_(size), rank_(size, 0) {
    for (std::size_t i = 0; i < size; ++i) parent_[i] = i;
}

std::size_t UnionFind::find(std::size_t x) {
    while (parent_[x] != x) {
        parent_[x] = parent_[parent_[x]]; // path halving
        x = parent_[x];
    }
    return x;
}

bool UnionFind::unite(std::size_t a, std::size_t b) {
    a = find(a);
    b = find(b);
    if (a == b) return false;
    if (rank_[a] < rank_[b]) std::swap(a, b);
    parent_[b] = a;
    if (rank_[a] == rank_[b]) ++rank_[a];
    return true;
}

} // namespace navic
