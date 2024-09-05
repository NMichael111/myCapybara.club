import mongoose from 'mongoose';
mongoose.connect(process.env.DSN);
const petSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  stats: {
    strength: Number,
    health: Number,
  },
  needs: {
    feeding: {
      type: Boolean,
      default: false, // Adjust the default value as needed
    },
    playing: {
      type: Boolean,
      default: false,
    },
  },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, minLength: 3 },
  password: { type: String, required: true, minLength: 8 },
  pets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }],
  gid: { type: String },
  last: {
    fed: { type: Date, default: Date.now, },
    played: { type: Date, default: Date.now, },
  },
  stats: {
    wins: Number,
    losses: Number,
  },
});

const User = mongoose.model('User', userSchema);
const Pet = mongoose.model('Pet', petSchema);
export { User, Pet };
