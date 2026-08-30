import mongoose from 'mongoose';

const MatchSchema = new mongoose.Schema({
  gameweek: { type: Number, required: true, min: 1, max: 38 }, // Replaces "group" and "stage"
  plMatchId: { type: String, unique: true, sparse: true, index: true }, // For our automated scraper later
  teamA: { type: String, required: true },
  teamB: { type: String, required: true },
  kickoffTime: { type: Date, required: true },
  scoreTeamA: { type: Number, default: null },
  scoreTeamB: { type: Number, default: null },
  playerGoals: { type: Object, default: {} },
  isFinished: { type: Boolean, default: false },
  teamALineup: [{ type: String }],
  teamBLineup: [{ type: String }],
  teamABench: [{ type: String }],
  teamBBench: [{ type: String }],
  pushReminderSent: { type: Boolean, default: false }

});

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);