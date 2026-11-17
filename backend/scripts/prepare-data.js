// Converts data/graph.ndjson.gz (OpenStreetMap extract) into the two files
// the app actually uses:
//   data/generated/graph.txt    compact text graph read by the C++ engine
//   data/generated/places.json  place gazetteer for local search / MongoDB seeding
//
// Usage:  npm run prepare-data   (from backend/)
import { createReadStream, createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const input = path.join(root, 'data', 'graph.ndjson.gz');
const outDir = path.join(root, 'data', 'generated');

async function write(stream, text) {
  if (!stream.write(text)) await once(stream, 'drain');
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const lines = createInterface({ input: createReadStream(input).pipe(createGunzip()), crlfDelay: Infinity });
  const graph = createWriteStream(path.join(outDir, 'graph.txt'));

  let header = null;
  let index = 0;
  for await (const line of lines) {
    if (!line) continue;
    if (!header) {
      header = JSON.parse(line);
      const { metadata, names, places } = header;
      if (metadata.schema_version !== 1) throw new Error('Unsupported graph schema');
      const [south, west, north, east] = metadata.bbox;
      await write(graph, `NAVIC-GRAPH 1\n${south} ${west} ${north} ${east}\n${metadata.nodes} ${metadata.edges} ${names.length}\n`);
      writeFileSync(path.join(outDir, 'places.json'), JSON.stringify(places));
      writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
      console.log(`Header: ${metadata.nodes} nodes, ${metadata.edges} edges, ${places.length} places`);
      continue;
    }
    const row = JSON.parse(line);
    // node rows: [osm_id, lat, lon]   edge rows: [from, to, length, t_drive, t_walk, t_cycle, name, modes]
    await write(graph, row.join(' ') + '\n');
    index++;
  }
  const expected = header.metadata.nodes + header.metadata.edges;
  if (index !== expected) throw new Error(`Expected ${expected} rows, read ${index}`);

  // Road names go last, one per line (newlines are stripped defensively).
  for (const name of header.names) await write(graph, String(name).replace(/[\r\n]+/g, ' ') + '\n');
  graph.end();
  await once(graph, 'finish');
  console.log(`Wrote ${path.relative(root, path.join(outDir, 'graph.txt'))} and places.json`);
}

main().catch(error => {
  console.error('prepare-data failed:', error.message);
  process.exit(1);
});
