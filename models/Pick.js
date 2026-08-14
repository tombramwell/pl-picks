import mongoose from 'mongoose';

const PickSchema = new mongoose.Schema({
  userId: { 
    type: String, // <-- Change this from ObjectId to String!
    required: true,
    index: true 
  },
  matchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Match', 
    required: true 
  },
  playerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Player', 
    required: true 
  },
  playerName: { type: String, required: true },
  playerTeam: { type: String, required: true },
  gameweek: { type: Number, required: true },
  goalsScored: { type: Number, default: 0 }
}, { timestamps: true });

// Ensure a user can only have one pick per match
PickSchema.index({ userId: 1, matchId: 1 }, { unique: true });

export default mongoose.models.Pick || mongoose.model('Pick', PickSchema);