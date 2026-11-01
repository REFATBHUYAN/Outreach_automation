import { Schema, model, type InferSchemaType } from 'mongoose';
import { STATUSES } from '../services/pipeline';

const threadSchema = new Schema(
  { direction: { type: String, enum: ['out', 'in'] }, subject: String, body: String, step: Number, at: { type: Date, default: Date.now } },
  { _id: false },
);

const candidateSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    name: { type: String, required: true },
    email: String,
    profileUrl: String,
    headline: String,
    location: String,
    company: String,
    education: String,
    summary: String, // search snippet / profile summary, as found
    skills: [String],
    query: String, // the search query that found them
    source: { type: String, enum: ['web', 'csv'] },
    score: Number,
    reason: String,
    status: { type: String, enum: STATUSES, default: 'sourced' },
    reached: { type: Schema.Types.Mixed, default: () => ({}) }, // status -> first time entered
    replyClass: String,
    flagged: { type: Boolean, default: false }, // candidate text looked like a prompt injection
    pendingReply: { subject: String, body: String },
    meetingAt: Date,
    thread: [threadSchema],
  },
  { timestamps: true, minimize: false },
);
candidateSchema.index({ jobId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });

export type CandidateDoc = InferSchemaType<typeof candidateSchema>;
export const Candidate = model('Candidate', candidateSchema);
