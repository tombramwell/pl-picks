import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  displayName: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // We will hash this later for security
  isAdmin: { type: Boolean, default: false },
    email: {
    type: String,
    required: true, // Make this true so reminders always work
    unique: true,
    lowercase: true, // Forces "Dad@Gmail.com" to save as "dad@gmail.com"
    trim: true,
  },
  receiveReminders: {
    type: Boolean,
    default: true, // Everyone starts "opted-in"
  },
  totalPoints: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);