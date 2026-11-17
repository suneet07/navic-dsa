import { config } from '../config/env.js';
import { EngineClient } from './EngineClient.js';

// One engine process shared by the whole API.
export const engine = new EngineClient(config.engine);
