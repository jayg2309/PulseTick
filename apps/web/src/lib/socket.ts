import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.setupEventListeners();
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.socket?.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Group methods
  joinGroup(groupId: string): void {
    this.socket?.emit('join-group', groupId);
  }

  leaveGroup(groupId: string): void {
    this.socket?.emit('leave-group', groupId);
  }

  // Message methods
  sendMessage(data: {
    groupId: string;
    content?: string;
    type?: string;
    media?: any;
    replyTo?: string;
  }): void {
    this.socket?.emit('send-message', data);
  }

  // Typing indicators
  startTyping(groupId: string): void {
    this.socket?.emit('typing-start', groupId);
  }

  stopTyping(groupId: string): void {
    this.socket?.emit('typing-stop', groupId);
  }

  // Reactions
  addReaction(data: { messageId: string; emoji: string; groupId: string }): void {
    this.socket?.emit('add-reaction', data);
  }

  removeReaction(data: { messageId: string; emoji: string; groupId: string }): void {
    this.socket?.emit('remove-reaction', data);
  }

  // Event listeners
  onNewMessage(callback: (message: any) => void): void {
    this.socket?.on('new-message', callback);
  }

  onUserJoined(callback: (data: { userId: string; username: string }) => void): void {
    this.socket?.on('user-joined', callback);
  }

  onUserLeft(callback: (data: { userId: string; username: string }) => void): void {
    this.socket?.on('user-left', callback);
  }

  onUserTyping(callback: (data: { userId: string; username: string; isTyping: boolean }) => void): void {
    this.socket?.on('user-typing', callback);
  }

  onReactionAdded(callback: (data: any) => void): void {
    this.socket?.on('reaction-added', callback);
  }

  onReactionRemoved(callback: (data: any) => void): void {
    this.socket?.on('reaction-removed', callback);
  }

  // Remove listeners
  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  get socket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
