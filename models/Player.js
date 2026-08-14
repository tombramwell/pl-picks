import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  plId: { type: String, required: true, unique: true }, // The official PL ID for automated scoring
  name: { type: String, required: true },
  team: { type: String, required: true },
  position: { type: String, required: true }, // "Forward", "Midfielder", "Defender", "Goalkeeper"
  squadNumber: { type: Number, default: 99 },
  isInactive: { type: Boolean, default: false } // We'll use this if they leave the Premier League
});

export default mongoose.models.Player || mongoose.model('Player', PlayerSchema);