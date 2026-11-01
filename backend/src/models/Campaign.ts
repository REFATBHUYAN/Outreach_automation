import { Schema, model } from 'mongoose';

const campaignSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    steps: [{ _id: false, day: Number, instructions: String }],
    drafts: [{ _id: false, candidateId: Schema.Types.ObjectId, name: String, email: String, step: Number, subject: String, body: String }],
    status: { type: String, enum: ['draft', 'active', 'paused', 'cancelled'], default: 'draft' },
    dailyLimit: Number,
  },
  { timestamps: true },
);

export const Campaign = model('Campaign', campaignSchema);
