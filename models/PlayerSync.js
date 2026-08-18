import mongoose from 'mongoose';

const PlayerSyncSchema = new mongoose.Schema(
  {
    startedAt: {
      type: Date,
      required: true,
    },

    finishedAt: {
      type: Date,
    },

    seasonId: {
      type: Number,
    },

    seasonLabel: {
      type: String,
    },

    clubsFound: {
      type: Number,
      default: 0,
    },

    clubsSuccessful: {
      type: Number,
      default: 0,
    },

    clubsFailed: {
      type: Number,
      default: 0,
    },

    playersProcessed: {
      type: Number,
      default: 0,
    },

    playersInserted: {
      type: Number,
      default: 0,
    },

    playersUpdated: {
      type: Number,
      default: 0,
    },

    transfersDetected: {
      type: Number,
      default: 0,
    },

    squadNumberChanges: {
      type: Number,
      default: 0,
    },

    playersMarkedInactive: {
      type: Number,
      default: 0,
    },

    errors: {
      type: [String],
      default: [],
    },

    details: {
      type: Array,
      default: [],
    },

    success: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PlayerSync ||
  mongoose.model('PlayerSync', PlayerSyncSchema);