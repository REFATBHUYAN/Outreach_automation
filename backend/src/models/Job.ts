import { Schema, model, type InferSchemaType } from 'mongoose';

const jobSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    mustHave: [String],
    niceToHave: [String],
    seniority: String,
    location: String,
    salary: String,
    remotePolicy: String,
    autoReply: { type: Boolean, default: false },
    searchQueries: [String],
    usage: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      costUsd: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export type JobDoc = InferSchemaType<typeof jobSchema>;
export const Job = model('Job', jobSchema);
