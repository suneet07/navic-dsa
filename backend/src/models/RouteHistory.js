// One computed route, stored so the UI can show "recent journeys".
import mongoose from 'mongoose';

const endpointSchema = new mongoose.Schema(
  { name: String, lat: { type: Number, required: true }, lon: { type: Number, required: true } },
  { _id: false },
);

const routeHistorySchema = new mongoose.Schema(
  {
    source: { type: endpointSchema, required: true },
    destination: { type: endpointSchema, required: true },
    mode: { type: String, enum: ['driving', 'walking', 'cycling'], required: true },
    algorithm: { type: String, required: true },
    provider: { type: String, enum: ['navic', 'osrm'], required: true },
    distanceM: Number,
    durationS: Number,
    visitedNodes: Number,
    searchMs: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

routeHistorySchema.index({ createdAt: -1 });

export const RouteHistory = mongoose.model('RouteHistory', routeHistorySchema);
