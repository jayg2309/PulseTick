import { create } from 'zustand';
import { messagesApi } from '@/lib/api';
import { socketService } from '@/lib/socket';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content?: string;
  sender: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  type: 'text' | 'image' | 'video' | 'file';
  media?: {
    publicId: string;
    secureUrl: string;
    resourceType: string;
    bytes?: number;
    width?: number;
    height?: number;
    format?: string;
  };
  replyTo?: {
    id: string;
    content?: string;
    sender: {
      username: string;
    };
    type: string;
  };
  reactions: Array<{
    emoji: string;
    user: {
      id: string;
      username: string;
    };
    createdAt: Date;
  }>;
  editedAt?: Date;
  createdAt: Date;
}

interface TypingUser {
  userId: string;
  username: string;
  isTyping: boolean;
}

interface MessageState {
  messages: Message[];
  typingUsers: TypingUser[];
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
  
  // Actions
  loadMessages: (groupId: string, page?: number) => Promise<void>;
  sendMessage: (groupId: string, data: {
    content?: string;
    type?: string;
    media?: any;
    replyTo?: string;
  }) => Promise<void>;
  editMessage: (groupId: string, messageId: string, content: string) => Promise<void>;
  deleteMessage: (groupId: string, messageId: string) => Promise<void>;
  addReaction: (groupId: string, messageId: string, emoji: string) => Promise<void>;
  removeReaction: (groupId: string, messageId: string, emoji: string) => Promise<void>;
  searchMessages: (groupId: string, query: string) => Promise<Message[]>;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  setTypingUsers: (users: TypingUser[]) => void;
  addTypingUser: (user: TypingUser) => void;
  removeTypingUser: (userId: string) => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  typingUsers: [],
  isLoading: false,
  hasMore: true,
  currentPage: 1,

  loadMessages: async (groupId: string, page = 1) => {
    set({ isLoading: true });
    try {
      const response = await messagesApi.getMessages(groupId, {
        page,
        limit: 50,
      });
      
      const messages = response.data.messages.map((message: any) => ({
        ...message,
        createdAt: new Date(message.createdAt),
        editedAt: message.editedAt ? new Date(message.editedAt) : undefined,
        reactions: message.reactions.map((reaction: any) => ({
          ...reaction,
          createdAt: new Date(reaction.createdAt),
        })),
      }));
      
      set((state) => ({
        messages: page === 1 ? messages : [...state.messages, ...messages],
        hasMore: response.data.pagination.hasMore,
        currentPage: page,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.error || 'Failed to load messages';
      toast.error(message);
    }
  },

  sendMessage: async (groupId: string, data) => {
    try {
      // Optimistically add message via socket
      socketService.sendMessage({ groupId, ...data });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to send message';
      toast.error(message);
      throw error;
    }
  },

  editMessage: async (groupId: string, messageId: string, content: string) => {
    try {
      await messagesApi.editMessage(groupId, messageId, content);
      
      set((state) => ({
        messages: state.messages.map((message) =>
          message.id === messageId
            ? { ...message, content, editedAt: new Date() }
            : message
        ),
      }));
      
      toast.success('Message updated');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to edit message';
      toast.error(message);
      throw error;
    }
  },

  deleteMessage: async (groupId: string, messageId: string) => {
    try {
      await messagesApi.deleteMessage(groupId, messageId);
      
      set((state) => ({
        messages: state.messages.filter((message) => message.id !== messageId),
      }));
      
      toast.success('Message deleted');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete message';
      toast.error(message);
      throw error;
    }
  },

  addReaction: async (groupId: string, messageId: string, emoji: string) => {
    try {
      socketService.addReaction({ messageId, emoji, groupId });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to add reaction';
      toast.error(message);
      throw error;
    }
  },

  removeReaction: async (groupId: string, messageId: string, emoji: string) => {
    try {
      socketService.removeReaction({ messageId, emoji, groupId });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to remove reaction';
      toast.error(message);
      throw error;
    }
  },

  searchMessages: async (groupId: string, query: string) => {
    try {
      const response = await messagesApi.searchMessages(groupId, query);
      return response.data.messages.map((message: any) => ({
        ...message,
        createdAt: new Date(message.createdAt),
      }));
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to search messages';
      toast.error(message);
      return [];
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateMessage: (messageId: string, updates: Partial<Message>) => {
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === messageId ? { ...message, ...updates } : message
      ),
    }));
  },

  removeMessage: (messageId: string) => {
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== messageId),
    }));
  },

  setTypingUsers: (users: TypingUser[]) => {
    set({ typingUsers: users });
  },

  addTypingUser: (user: TypingUser) => {
    set((state) => {
      const existingIndex = state.typingUsers.findIndex(u => u.userId === user.userId);
      if (existingIndex >= 0) {
        const updated = [...state.typingUsers];
        updated[existingIndex] = user;
        return { typingUsers: updated };
      }
      return { typingUsers: [...state.typingUsers, user] };
    });
  },

  removeTypingUser: (userId: string) => {
    set((state) => ({
      typingUsers: state.typingUsers.filter(user => user.userId !== userId),
    }));
  },

  clearMessages: () => {
    set({
      messages: [],
      typingUsers: [],
      isLoading: false,
      hasMore: true,
      currentPage: 1,
    });
  },
}));
