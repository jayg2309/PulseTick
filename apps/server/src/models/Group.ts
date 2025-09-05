import mongoose, { Document, Schema } from 'mongoose';
import { nanoid } from 'nanoid';

export interface IGroup extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  expiresAt: Date;
  createdBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index for auto-deletion
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    inviteCode: {
      type: String,
      unique: true,
      default: () => nanoid(10),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
groupSchema.index({ createdBy: 1 });
groupSchema.index({ inviteCode: 1 });
groupSchema.index({ expiresAt: 1 });
groupSchema.index({ isPublic: 1, expiresAt: 1 });

// Generate new invite code method
groupSchema.methods.generateNewInviteCode = function (): string {
  this.inviteCode = nanoid(10);
  return this.inviteCode;
};

export const Group = mongoose.model<IGroup>('Group', groupSchema);
