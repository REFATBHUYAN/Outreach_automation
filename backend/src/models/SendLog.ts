import { Schema, model } from 'mongoose';

// The unique index is the guarantee that no candidate receives the same step twice.
const sendLogSchema = new Schema({
  campaignId: { type: Schema.Types.ObjectId, required: true },
  candidateId: { type: Schema.Types.ObjectId, required: true },
  step: { type: Number, required: true },
  sentAt: { type: Date, default: Date.now },
});
sendLogSchema.index({ campaignId: 1, candidateId: 1, step: 1 }, { unique: true });
sendLogSchema.index({ campaignId: 1, sentAt: 1 });

export const SendLog = model('SendLog', sendLogSchema);
