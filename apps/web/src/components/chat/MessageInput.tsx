import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image, File } from 'lucide-react';
import { useMessageStore } from '@/store/messageStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface Message {
  _id: string;
  content: string;
  sender: {
    username: string;
  };
}

interface MessageInputProps {
  groupId: string;
  replyTo?: Message | null;
  editingMessage?: Message | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
}

export function MessageInput({ 
  groupId, 
  replyTo, 
  editingMessage, 
  onCancelReply, 
  onCancelEdit 
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { sendMessage, editMessage, startTyping, stopTyping } = useMessageStore();

  // Set content when editing
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  // Clear file selection
  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContent(value);

    if (value.trim() && !isTyping) {
      setIsTyping(true);
      startTyping(groupId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(groupId);
    }, 1000);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedContent = content.trim();
    if (!trimmedContent && !selectedFile) return;

    try {
      if (editingMessage) {
        // Edit existing message
        await editMessage(editingMessage._id, { content: trimmedContent });
        onCancelEdit?.();
      } else {
        // Send new message
        const messageData: any = {
          content: trimmedContent,
          type: selectedFile ? (selectedFile.type.startsWith('image/') ? 'image' : 'file') : 'text',
          groupId,
        };

        if (replyTo) {
          messageData.replyTo = replyTo._id;
        }

        if (selectedFile) {
          messageData.file = selectedFile;
        }

        await sendMessage(messageData);
        onCancelReply?.();
      }

      // Reset form
      setContent('');
      clearFile();
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        stopTyping(groupId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t bg-background p-4">
      {/* Reply/Edit Context */}
      {(replyTo || editingMessage) && (
        <div className="mb-3 p-3 bg-muted rounded-lg flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {editingMessage ? 'Editing message' : `Replying to ${replyTo?.sender.username}`}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {editingMessage?.content || replyTo?.content}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={editingMessage ? onCancelEdit : onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div className="mb-3 p-3 bg-muted rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Preview"
                className="w-12 h-12 object-cover rounded"
              />
            ) : (
              <div className="w-12 h-12 bg-muted-foreground/20 rounded flex items-center justify-center">
                <File className="h-6 w-6" />
              </div>
            )}
            <div>
              <div className="font-medium text-sm">{selectedFile.name}</div>
              <div className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={clearFile}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            ref={inputRef}
            value={content}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={editingMessage ? 'Edit your message...' : 'Type a message...'}
            className="resize-none"
            disabled={false}
          />
        </div>

        {/* File Upload Button */}
        {!editingMessage && (
          <div className="flex gap-1">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept="image/*,*/*"
              className="hidden"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Send Button */}
        <Button
          type="submit"
          size="sm"
          disabled={!content.trim() && !selectedFile}
          className={cn(
            'transition-colors',
            (content.trim() || selectedFile) && 'bg-primary hover:bg-primary/90'
          )}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
