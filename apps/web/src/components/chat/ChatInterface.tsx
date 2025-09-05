import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Settings, Clock, Copy, Check } from 'lucide-react';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store/authStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatExpiryTime } from '@/lib/utils';
import { socketService } from '@/lib/socket';

interface Message {
  _id: string;
  content: string;
  sender: {
    username: string;
  };
}

export function ChatInterface() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false);
  
  const { user } = useAuthStore();
  const { 
    groups, 
    members, 
    loading, 
    fetchGroup, 
    fetchGroupMembers,
    leaveGroup 
  } = useGroupStore();

  const group = groupId ? groups[groupId] : null;
  const groupMembers = groupId ? members[groupId] || [] : [];
  const isLoading = loading[groupId || ''] || false;

  // Fetch group data on mount
  useEffect(() => {
    if (groupId) {
      fetchGroup(groupId);
      fetchGroupMembers(groupId);
      
      // Join socket room
      socketService.joinGroup(groupId);
      
      return () => {
        // Leave socket room on cleanup
        socketService.leaveGroup(groupId);
      };
    }
  }, [groupId, fetchGroup, fetchGroupMembers]);

  // Handle reply
  const handleReply = (message: Message) => {
    setReplyTo(message);
    setEditingMessage(null);
  };

  // Handle edit
  const handleEdit = (message: Message) => {
    setEditingMessage(message);
    setReplyTo(null);
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyTo(null);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  // Copy invite code
  const handleCopyInviteCode = async () => {
    if (group?.inviteCode) {
      try {
        await navigator.clipboard.writeText(group.inviteCode);
        setInviteCodeCopied(true);
        setTimeout(() => setInviteCodeCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy invite code:', error);
      }
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!groupId || !group) return;
    
    const confirmMessage = `Are you sure you want to leave "${group.name}"? You'll need an invite code to rejoin.`;
    if (window.confirm(confirmMessage)) {
      try {
        await leaveGroup(groupId);
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to leave group:', error);
      }
    }
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!group?.expiresAt) return null;
    const now = new Date();
    const expiresAt = new Date(group.expiresAt);
    const timeLeft = expiresAt.getTime() - now.getTime();
    
    if (timeLeft <= 0) return 'Expired';
    return formatExpiryTime(timeLeft);
  };

  if (isLoading && !group) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Group not found</h2>
          <p className="text-muted-foreground mb-4">
            This group may have expired or been deleted.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const timeRemaining = getTimeRemaining();
  const isExpired = timeRemaining === 'Expired';
  const isOwner = group.createdBy === user?._id;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex-1">
              <h1 className="font-semibold text-lg">{group.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{groupMembers.length} members</span>
                </div>
                
                {timeRemaining && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span className={isExpired ? 'text-destructive' : ''}>
                      {timeRemaining}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Invite Code */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyInviteCode}
              className="hidden sm:flex"
            >
              {inviteCodeCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  {group.inviteCode}
                </>
              )}
            </Button>

            {/* Settings */}
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Group Description */}
        {group.description && (
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            {group.description}
          </p>
        )}

        {/* Expired Warning */}
        {isExpired && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              This group has expired and will be deleted soon. No new messages can be sent.
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <MessageList
        groupId={groupId!}
        onReply={handleReply}
        onEdit={handleEdit}
      />

      {/* Message Input */}
      {!isExpired && (
        <MessageInput
          groupId={groupId!}
          replyTo={replyTo}
          editingMessage={editingMessage}
          onCancelReply={handleCancelReply}
          onCancelEdit={handleCancelEdit}
        />
      )}

      {/* Mobile Actions */}
      <div className="sm:hidden border-t p-2 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyInviteCode}
          className="flex-1"
        >
          {inviteCodeCopied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Invite: {group.inviteCode}
            </>
          )}
        </Button>
        
        {!isOwner && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLeaveGroup}
            className="text-destructive hover:text-destructive"
          >
            Leave
          </Button>
        )}
      </div>
    </div>
  );
}
