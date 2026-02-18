import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
    ref: 'User'
  },
  to: {
    type: String,
    required: true,
    ref: 'User'
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
messageSchema.index({ from: 1, to: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
