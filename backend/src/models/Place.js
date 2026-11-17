// A named place from the bundled OpenStreetMap gazetteer (seeded by scripts/seed-places.js).
import mongoose from 'mongoose';

const placeSchema = new mongoose.Schema(
  {
    placeId: { type: String, required: true, unique: true }, // e.g. "node/16173236"
    name: { type: String, required: true },
    nameLower: { type: String, required: true, index: true },
    aliases: { type: String, default: '' },
    kind: { type: String, default: 'place' },
    source: { type: String, default: 'OpenStreetMap' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lon, lat] (GeoJSON order)
    },
  },
  { versionKey: false },
);

placeSchema.index({ location: '2dsphere' });

// Shape the frontend expects (same as the in-memory gazetteer).
placeSchema.methods.toPlace = function toPlace() {
  return {
    id: this.placeId,
    name: this.name,
    kind: this.kind,
    source: this.source,
    lat: this.location.coordinates[1],
    lon: this.location.coordinates[0],
  };
};

export const Place = mongoose.model('Place', placeSchema);
