import { useEffect, useRef, useState } from 'react';
import { useMessageStore } from '@/store/messageStore';
import { useAuthStore } from '@/store/authStore';
import { MessageItem } from './MessageItem';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { ChevronDown } from 'lucide-react';
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

interface MessageListProps {
  groupId: string;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
}

export function MessageList({ groupId, onReply, onEdit }: MessageListProps) {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { 
    messages, 
    loading, 
    hasMore, 
    typingUsers,
    fetchMessages, 
    loadMoreMessages 
  } = useMessageStore();

  const groupMessages = messages[groupId] || [];
  const groupTypingUsers = typingUsers[groupId] || [];
  const isLoading = loading[groupId] || false;
  const groupHasMore = hasMore[groupId] || false;

  // Fetch messages on mount
  useEffect(() => {
    if (groupId) {
      fetchMessages(groupId);
    }
  }, [groupId, fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (groupMessages.length > 0) {
      const container = containerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isNearBottom) {
          scrollToBottom();
        }
      }
    }
  }, [groupMessages]);

  // Handle scroll events
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);

    // Load more messages when scrolled to top
    if (scrollTop === 0 && groupHasMore && !isLoading) {
      loadMoreMessages(groupId);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter out current user from typing users
  const displayTypingUsers = groupTypingUsers.filter(username => 
    user?.username !== username
  );

  if (isLoading && groupMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        onScroll={handleScroll}
      >
        {/* Load More Button */}
        {groupHasMore && (
          <div className="flex justify-center p-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMoreMessages(groupId)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Loading...
                </>
              ) : (
                'Load more messages'
              )}
            </Button>
          </div>
        )}

        {/* Messages */}
        {groupMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No messages yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Be the first to send a message in this group!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {groupMessages.map((message) => (
              <MessageItem
                key={message._id}
                message={message}
                onReply={onReply}
                onEdit={onEdit}
              />
            ))}
          </div>
        )}

        {/* Typing Indicators */}
        {displayTypingUsers.length > 0 && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <span>
                {displayTypingUsers.length === 1
                  ? `${displayTypingUsers[0]} is typing...`
                  : displayTypingUsers.length === 2
                  ? `${displayTypingUsers[0]} and ${displayTypingUsers[1]} are typing...`
                  : `${displayTypingUsers.length} people are typing...`
                }
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Button
          size="sm"
          className={cn(
            'absolute bottom-4 right-4 rounded-full shadow-lg',
            'bg-primary hover:bg-primary/90'
          )}
          onClick={scrollToBottom}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
