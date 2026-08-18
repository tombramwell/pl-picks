import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  plId: { type: String, required: true, unique: true, index: true }, // The official PL ID for automated scoring
  name: { type: String, required: true },
  team: { type: String, required: true },
  teamId: { type: Number, required: true, index: true },
  position: { type: String, default: 'Unknown' }, // "Forward", "Midfielder", "Defender", "Goalkeeper"
  squadNumber: { type: Number, default: 99 },
  isInactive: { type: Boolean, default: false, index: true }, // We'll use this if they leave the Premier League
  seasonId: { type: Number, index: true },
  lastSeenInSquad: { type: Date, index: true },
  lastSynced: { type: Date },
  previousTeam: {type: String, default: null},
  previousTeamId: {type: Number, default: null},
  previousSquadNumber: {type: Number, default: null}, 
},
{ timestamps: true });

export default mongoose.models.Player || mongoose.model('Player', PlayerSchema);