import mongoose from 'mongoose';

const PickSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  playerName: { type: String, required: true },
  playerTeam: { type: String, required: true },
  gameweek: { type: Number, required: true },
  goalsScored: { type: Number, default: 0 },
  points: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.Pick || mongoose.model('Pick', PickSchema);