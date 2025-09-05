import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Reply, Smile, Trash2, Edit3 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMessageStore } from '@/store/messageStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Message {
  _id: string;
  content: string;
  type: 'text' | 'image' | 'file';
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  groupId: string;
  replyTo?: {
    _id: string;
    content: string;
    sender: {
      username: string;
    };
  };
  media?: {
    url: string;
    publicId: string;
    type: string;
    size: number;
    filename: string;
  };
  reactions: Array<{
    emoji: string;
    users: string[];
    count: number;
  }>;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

interface MessageItemProps {
  message: Message;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
}

export function MessageItem({ message, onReply, onEdit }: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  const { user } = useAuthStore();
  const { deleteMessage, addReaction, removeReaction } = useMessageStore();

  const isOwnMessage = user?._id === message.sender._id;
  const canEdit = isOwnMessage && message.type === 'text';
  const canDelete = isOwnMessage;

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      await deleteMessage(message._id);
    }
  };

  const handleReaction = async (emoji: string) => {
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    const userHasReacted = existingReaction?.users.includes(user?._id || '');

    if (userHasReacted) {
      await removeReaction(message._id, emoji);
    } else {
      await addReaction(message._id, emoji);
    }
  };

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  return (
    <div
      className={cn(
        'group flex gap-3 p-3 hover:bg-muted/50 transition-colors',
        isOwnMessage && 'flex-row-reverse'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          {message.sender.avatar ? (
            <img
              src={message.sender.avatar}
              alt={message.sender.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-primary">
              {message.sender.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className={cn('flex-1 min-w-0', isOwnMessage && 'text-right')}>
        {/* Header */}
        <div className={cn('flex items-center gap-2 mb-1', isOwnMessage && 'justify-end')}>
          <span className="font-medium text-sm">{message.sender.username}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
          {message.isEdited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        {/* Reply Reference */}
        {message.replyTo && (
          <div className={cn(
            'mb-2 p-2 border-l-2 border-muted bg-muted/30 rounded text-sm',
            isOwnMessage && 'border-r-2 border-l-0'
          )}>
            <div className="font-medium text-xs text-muted-foreground mb-1">
              Replying to {message.replyTo.sender.username}
            </div>
            <div className="text-muted-foreground truncate">
              {message.replyTo.content}
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className={cn(
          'rounded-lg p-3 max-w-md',
          isOwnMessage 
            ? 'bg-primary text-primary-foreground ml-auto' 
            : 'bg-muted'
        )}>
          {message.type === 'text' && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
          
          {message.type === 'image' && message.media && (
            <div>
              <img
                src={message.media.url}
                alt="Shared image"
                className="max-w-full h-auto rounded"
                loading="lazy"
              />
              {message.content && (
                <p className="mt-2 whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          )}

          {message.type === 'file' && message.media && (
            <div className="flex items-center gap-2 p-2 border rounded">
              <div className="flex-1">
                <div className="font-medium">{message.media.filename}</div>
                <div className="text-sm text-muted-foreground">
                  {(message.media.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <Button size="sm" asChild>
                <a href={message.media.url} target="_blank" rel="noopener noreferrer">
                  Download
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-2', isOwnMessage && 'justify-end')}>
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReaction(reaction.emoji)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors',
                  reaction.users.includes(user?._id || '')
                    ? 'bg-primary/20 border-primary/50'
                    : 'bg-muted border-muted-foreground/20 hover:bg-muted/80'
                )}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Reactions */}
        {showActions && (
          <div className={cn(
            'flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity',
            isOwnMessage && 'justify-end'
          )}>
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="p-1 rounded hover:bg-muted transition-colors"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className={cn(
          'flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
          isOwnMessage && 'order-first'
        )}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onReply?.(message)}
            title="Reply"
          >
            <Reply className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            title="Add reaction"
          >
            <Smile className="h-4 w-4" />
          </Button>

          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit?.(message)}
              title="Edit message"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}

          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              title="Delete message"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          <Button size="sm" variant="ghost" title="More options">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
