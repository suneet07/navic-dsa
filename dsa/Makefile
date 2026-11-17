# Build the C++ routing engine and its tests.
#   Windows (MinGW):  mingw32-make          Linux/macOS:  make
#   Targets: all (default), test, clean

CXX      ?= g++
CXXFLAGS ?= -std=c++14 -O3 -Wall -Wextra
INCLUDES  = -Iinclude
BUILD     = build

# 32-bit x86 compilers (e.g. MinGW.org) default to x87 floating point, which is
# ~30x slower on the Floyd-Warshall inner loop. Force SSE2 math there.
MACHINE := $(shell $(CXX) -dumpmachine)
ifneq (,$(filter i386% i486% i586% i686% mingw32,$(MACHINE)))
  CXXFLAGS += -msse2 -mfpmath=sse
endif

ifeq ($(OS),Windows_NT)
  EXE = .exe
  LDFLAGS += -static -static-libgcc -static-libstdc++
endif

LIB_SOURCES = \
  src/geo.cpp \
  src/union_find.cpp \
  src/graph.cpp \
  src/search_result.cpp \
  src/snapping.cpp \
  src/json_writer.cpp \
  src/route_builder.cpp \
  src/algorithms/dijkstra.cpp \
  src/algorithms/astar.cpp \
  src/algorithms/bfs.cpp \
  src/algorithms/dfs.cpp \
  src/algorithms/floyd_warshall.cpp \
  src/algorithms.cpp \
  src/engine.cpp

LIB_OBJECTS = $(patsubst src/%.cpp,$(BUILD)/obj/%.o,$(LIB_SOURCES))
ENGINE      = $(BUILD)/navic-engine$(EXE)
TESTS       = $(BUILD)/test-algorithms$(EXE)

.PHONY: all test clean

all: $(ENGINE)

$(ENGINE): $(LIB_OBJECTS) $(BUILD)/obj/main.o
	$(CXX) $(CXXFLAGS) $^ -o $@ $(LDFLAGS)

$(TESTS): $(LIB_OBJECTS) $(BUILD)/obj/tests/test_algorithms.o
	$(CXX) $(CXXFLAGS) $^ -o $@ $(LDFLAGS)

test: $(TESTS)
	./$(TESTS)

$(BUILD)/obj/tests/%.o: tests/%.cpp
	@mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c $< -o $@

$(BUILD)/obj/%.o: src/%.cpp
	@mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) $(INCLUDES) -MMD -MP -c $< -o $@

clean:
	rm -rf $(BUILD)

-include $(LIB_OBJECTS:.o=.d)
