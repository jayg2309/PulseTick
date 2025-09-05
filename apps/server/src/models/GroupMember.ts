import mongoose, { Document, Schema } from 'mongoose';

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  BANNED = 'banned',
}

export interface IGroupMember extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  group: mongoose.Types.ObjectId;
  role: MemberRole;
  joinedAt: Date;
  bannedAt?: Date;
  bannedBy?: mongoose.Types.ObjectId;
  banReason?: string;
}

const groupMemberSchema = new Schema<IGroupMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(MemberRole),
      default: MemberRole.MEMBER,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    bannedAt: {
      type: Date,
    },
    bannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    banReason: {
      type: String,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
groupMemberSchema.index({ user: 1, group: 1 }, { unique: true });
groupMemberSchema.index({ group: 1, role: 1 });
groupMemberSchema.index({ user: 1 });

export const GroupMember = mongoose.model<IGroupMember>('GroupMember', groupMemberSchema);
