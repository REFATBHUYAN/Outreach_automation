import { Schema, model } from 'mongoose';

const activitySchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', index: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate' },
    candidateName: String,
    type: { type: String, required: true }, // status_change | email_sent | reply_received | reply_sent | campaign | job
    from: String,
    to: String,
    actor: { type: String, enum: ['recruiter', 'ai', 'system'] },
    via: { type: String, enum: ['ui', 'chat', 'worker'] },
    note: String,
  },
  { timestamps: true },
);

export const Activity = model('Activity', activitySchema);
