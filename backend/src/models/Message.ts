import { Schema, model } from 'mongoose';

// One persisted chat thread. A message may carry an interactive card (see views/cards.ts).
const messageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, default: '' },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
    // "New chat" hides old messages instead of deleting them: job pages still read sourcing progress from them.
    archived: { type: Boolean, default: false, index: true },
    card: {
      type: { type: String },
      data: Schema.Types.Mixed,
      status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'info'] },
    },
  },
  { timestamps: true },
);

export const Message = model('Message', messageSchema);
