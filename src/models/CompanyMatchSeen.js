import mongoose from 'mongoose';

/** Which (gig, REP) matches the company has already been told about, so only NEW profiles notify. */
const companyMatchSeenSchema = new mongoose.Schema(
  {
    gigId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);
companyMatchSeenSchema.index({ gigId: 1, agentId: 1 }, { unique: true });

export default mongoose.model('CompanyMatchSeen', companyMatchSeenSchema);
