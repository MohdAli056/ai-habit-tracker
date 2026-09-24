import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [6, 'Password must be at least 6 characters.'],
    },
    avatar: {
      type: String,
      default: '',
    },
    morningMotivation: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Hash password before saving — only when it has been modified.
// ---------------------------------------------------------------------------
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ---------------------------------------------------------------------------
// Instance method: compare a candidate plaintext password to the stored hash.
// ---------------------------------------------------------------------------
userSchema.methods.matchPassword = async function matchPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ---------------------------------------------------------------------------
// Remove password from every JSON serialisation.
// ---------------------------------------------------------------------------
userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;
