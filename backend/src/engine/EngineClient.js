// Manages the long-running C++ engine process (dsa/build/navic-engine).
//
// The graph (300k nodes) takes ~2 s to load, so we start the engine once and
// talk to it over stdin/stdout using one text line per request and one JSON
// line per response (see dsa/include/navic/engine.hpp for the protocol).
import { spawn } from 'node:child_process';
import { accessSync, chmodSync, constants, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { ApiError } from '../utils/ApiError.js';

// Serverless hosts (e.g. Vercel) may ship bundled files without the execute bit
// on a read-only disk. In that case run a copy from the writable temp folder.
function executableCopy(binary) {
  if (process.platform === 'win32') return binary;
  try {
    accessSync(binary, constants.X_OK);
    return binary;
  } catch {
    const copy = path.join(tmpdir(), path.basename(binary));
    if (!existsSync(copy)) copyFileSync(binary, copy);
    chmodSync(copy, 0o755);
    return copy;
  }
}

export class EngineClient {
  constructor({ binary, graph, floydMaxNodes, timeoutMs }) {
    this.binary = binary;
    this.graph = graph;
    this.floydMaxNodes = floydMaxNodes;
    this.timeoutMs = timeoutMs;
    this.process = null;
    this.pending = new Map(); // id -> { resolve, reject, timer }
    this.nextId = 1;
    this.info = null;
    this.readyPromise = null;
    this.stopped = false;
  }

  get ready() {
    return this.info !== null;
  }

  start() {
    if (this.readyPromise) return this.readyPromise;
    for (const [file, hint] of [[this.binary, 'build it with `mingw32-make` (Windows) or `make` inside dsa/'],
      [this.graph, 'run `npm run prepare-data` inside backend/']]) {
      if (!existsSync(file)) return Promise.reject(new Error(`Missing ${file} — ${hint}`));
    }

    const binary = executableCopy(this.binary);
    this.readyPromise = new Promise((resolve, reject) => {
      const child = spawn(binary, [this.graph, '--floyd-max-nodes', String(this.floydMaxNodes)], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
      this.process = child;
      let handshake = true;

      child.stderr.on('data', chunk => process.stderr.write(`[engine] ${chunk}`));
      child.on('error', error => reject(error));
      child.on('exit', code => {
        const wasReady = this.ready;
        this.info = null;
        this.process = null;
        this.readyPromise = null;
        this.failAll(new ApiError(503, 'ENGINE_RESTARTING', 'The routing engine restarted; please retry.'));
        if (!wasReady) reject(new Error(`Engine exited during startup (code ${code})`));
        else if (!this.stopped) {
          console.error(`[engine] exited with code ${code}; restarting in 1 s`);
          setTimeout(() => this.start().catch(err => console.error('[engine] restart failed:', err.message)), 1000);
        }
      });

      createInterface({ input: child.stdout, crlfDelay: Infinity }).on('line', line => {
        let message;
        try { message = JSON.parse(line); } catch { return console.error('[engine] unreadable line:', line.slice(0, 200)); }
        if (handshake && message.ready) {
          handshake = false;
          this.send('info').then(info => { this.info = info; resolve(info); }, reject);
          return;
        }
        this.settle(message);
      });
    });
    return this.readyPromise;
  }

  stop() {
    this.stopped = true;
    this.process?.stdin.end();
    this.process?.kill();
  }

  // Low-level: sends "<id> <command> <args...>" and resolves with `result`.
  send(command, ...args) {
    if (!this.process) return Promise.reject(new ApiError(503, 'ENGINE_UNAVAILABLE', 'The routing engine is not running.'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new ApiError(504, 'ENGINE_TIMEOUT', 'The routing engine took too long to answer.'));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.process.stdin.write(`${id} ${command} ${args.join(' ')}\n`);
    });
  }

  settle(message) {
    const entry = this.pending.get(message.id);
    if (!entry) return;
    this.pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.ok) entry.resolve(message.result);
    else entry.reject(new ApiError(message.error.status, message.error.code, message.error.message));
  }

  failAll(error) {
    for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    this.pending.clear();
  }

  // High-level helpers -------------------------------------------------------
  route({ algorithm, mode, source, destination, exploreLimit = 2500 }) {
    return this.send('route', algorithm, mode, source.lat, source.lon, destination.lat, destination.lon, exploreLimit);
  }

  compare({ mode, source, destination, exploreLimit = 600 }) {
    return this.send('compare', mode, source.lat, source.lon, destination.lat, destination.lon, exploreLimit);
  }
}
