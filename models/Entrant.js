import mongoose from 'mongoose';

const EntrantSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  hasPaid: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Entrant || mongoose.model('Entrant', EntrantSchema);