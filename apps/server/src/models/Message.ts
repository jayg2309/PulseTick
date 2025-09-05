import mongoose, { Document, Schema } from 'mongoose';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
}

export interface IMediaData {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  bytes?: number;
  width?: number;
  height?: number;
  format?: string;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  content?: string;
  sender: mongoose.Types.ObjectId;
  group: mongoose.Types.ObjectId;
  type: MessageType;
  media?: IMediaData;
  replyTo?: mongoose.Types.ObjectId;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const mediaDataSchema = new Schema<IMediaData>({
  publicId: { type: String, required: true },
  secureUrl: { type: String, required: true },
  resourceType: { type: String, required: true },
  bytes: { type: Number },
  width: { type: Number },
  height: { type: Number },
  format: { type: String },
}, { _id: false });

const messageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
      maxlength: 2000,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      default: MessageType.TEXT,
    },
    media: {
      type: mediaDataSchema,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    editedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ replyTo: 1 });
messageSchema.index({ group: 1, deletedAt: 1, createdAt: -1 });

// Text search index for message content
messageSchema.index({ content: 'text' });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
