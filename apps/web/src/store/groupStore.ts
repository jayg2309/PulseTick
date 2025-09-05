import { create } from 'zustand';
import { groupsApi } from '@/lib/api';
import { socketService } from '@/lib/socket';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  inviteCode?: string;
  expiresAt: Date;
  createdBy: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  memberCount?: number;
  userRole?: string;
  joinedAt?: Date;
}

interface Member {
  id: string;
  username: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen: Date;
  role: string;
  joinedAt: Date;
}

interface GroupState {
  groups: Group[];
  currentGroup: Group | null;
  members: Member[];
  isLoading: boolean;
  isLoadingMembers: boolean;
  
  // Actions
  loadGroups: () => Promise<void>;
  loadGroup: (groupId: string) => Promise<void>;
  createGroup: (data: {
    name: string;
    description?: string;
    isPublic: boolean;
    expiryDuration: number;
  }) => Promise<Group>;
  updateGroup: (groupId: string, data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
  }) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  joinGroup: (inviteCode: string) => Promise<Group>;
  leaveGroup: (groupId: string) => Promise<void>;
  loadMembers: (groupId: string) => Promise<void>;
  updateMemberRole: (groupId: string, userId: string, role: string) => Promise<void>;
  banMember: (groupId: string, userId: string, reason?: string) => Promise<void>;
  generateNewInviteCode: (groupId: string) => Promise<string>;
  setCurrentGroup: (group: Group | null) => void;
  clearGroups: () => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  currentGroup: null,
  members: [],
  isLoading: false,
  isLoadingMembers: false,

  loadGroups: async () => {
    set({ isLoading: true });
    try {
      const response = await groupsApi.getGroups();
      const groups = response.data.groups.map((group: any) => ({
        ...group,
        expiresAt: new Date(group.expiresAt),
        createdAt: new Date(group.createdAt),
        joinedAt: group.joinedAt ? new Date(group.joinedAt) : undefined,
      }));
      
      set({ groups, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const message = error.response?.data?.error || 'Failed to load groups';
      toast.error(message);
    }
  },

  loadGroup: async (groupId: string) => {
    try {
      const response = await groupsApi.getGroup(groupId);
      const group = {
        ...response.data.group,
        expiresAt: new Date(response.data.group.expiresAt),
        createdAt: new Date(response.data.group.createdAt),
        joinedAt: response.data.group.joinedAt ? new Date(response.data.group.joinedAt) : undefined,
      };
      
      set({ currentGroup: group });
      
      // Join the group room via socket
      socketService.joinGroup(groupId);
      
      return group;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to load group';
      toast.error(message);
      throw error;
    }
  },

  createGroup: async (data) => {
    try {
      const response = await groupsApi.createGroup(data);
      const group = {
        ...response.data.group,
        expiresAt: new Date(response.data.group.expiresAt),
        createdAt: new Date(response.data.group.createdAt),
      };
      
      set((state) => ({
        groups: [group, ...state.groups],
      }));
      
      toast.success('Group created successfully!');
      return group;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create group';
      toast.error(message);
      throw error;
    }
  },

  updateGroup: async (groupId: string, data) => {
    try {
      const response = await groupsApi.updateGroup(groupId, data);
      const updatedGroup = {
        ...response.data.group,
        expiresAt: new Date(response.data.group.expiresAt),
        createdAt: new Date(response.data.group.createdAt),
        updatedAt: new Date(response.data.group.updatedAt),
      };
      
      set((state) => ({
        groups: state.groups.map((group) =>
          group.id === groupId ? { ...group, ...updatedGroup } : group
        ),
        currentGroup: state.currentGroup?.id === groupId 
          ? { ...state.currentGroup, ...updatedGroup }
          : state.currentGroup,
      }));
      
      toast.success('Group updated successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update group';
      toast.error(message);
      throw error;
    }
  },

  deleteGroup: async (groupId: string) => {
    try {
      await groupsApi.deleteGroup(groupId);
      
      set((state) => ({
        groups: state.groups.filter((group) => group.id !== groupId),
        currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
      }));
      
      // Leave the group room via socket
      socketService.leaveGroup(groupId);
      
      toast.success('Group deleted successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete group';
      toast.error(message);
      throw error;
    }
  },

  joinGroup: async (inviteCode: string) => {
    try {
      const response = await groupsApi.joinGroup(inviteCode);
      const group = {
        ...response.data.group,
        expiresAt: new Date(response.data.group.expiresAt),
        joinedAt: new Date(response.data.group.joinedAt),
      };
      
      set((state) => ({
        groups: [group, ...state.groups],
      }));
      
      toast.success(`Joined group: ${group.name}`);
      return group;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to join group';
      toast.error(message);
      throw error;
    }
  },

  leaveGroup: async (groupId: string) => {
    try {
      await groupsApi.leaveGroup(groupId);
      
      set((state) => ({
        groups: state.groups.filter((group) => group.id !== groupId),
        currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
      }));
      
      // Leave the group room via socket
      socketService.leaveGroup(groupId);
      
      toast.success('Left group successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to leave group';
      toast.error(message);
      throw error;
    }
  },

  loadMembers: async (groupId: string) => {
    set({ isLoadingMembers: true });
    try {
      const response = await groupsApi.getMembers(groupId);
      const members = response.data.members.map((member: any) => ({
        ...member,
        lastSeen: new Date(member.lastSeen),
        joinedAt: new Date(member.joinedAt),
      }));
      
      set({ members, isLoadingMembers: false });
    } catch (error: any) {
      set({ isLoadingMembers: false });
      const message = error.response?.data?.error || 'Failed to load members';
      toast.error(message);
    }
  },

  updateMemberRole: async (groupId: string, userId: string, role: string) => {
    try {
      await groupsApi.updateMemberRole(groupId, userId, role);
      
      set((state) => ({
        members: state.members.map((member) =>
          member.id === userId ? { ...member, role } : member
        ),
      }));
      
      toast.success('Member role updated successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update member role';
      toast.error(message);
      throw error;
    }
  },

  banMember: async (groupId: string, userId: string, reason?: string) => {
    try {
      await groupsApi.banMember(groupId, userId, reason);
      
      set((state) => ({
        members: state.members.filter((member) => member.id !== userId),
      }));
      
      toast.success('Member banned successfully!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to ban member';
      toast.error(message);
      throw error;
    }
  },

  generateNewInviteCode: async (groupId: string) => {
    try {
      const response = await groupsApi.generateNewInviteCode(groupId);
      const { inviteCode } = response.data;
      
      set((state) => ({
        groups: state.groups.map((group) =>
          group.id === groupId ? { ...group, inviteCode } : group
        ),
        currentGroup: state.currentGroup?.id === groupId 
          ? { ...state.currentGroup, inviteCode }
          : state.currentGroup,
      }));
      
      toast.success('New invite code generated!');
      return inviteCode;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to generate invite code';
      toast.error(message);
      throw error;
    }
  },

  setCurrentGroup: (group: Group | null) => {
    set({ currentGroup: group });
    
    if (group) {
      socketService.joinGroup(group.id);
    }
  },

  clearGroups: () => {
    set({
      groups: [],
      currentGroup: null,
      members: [],
      isLoading: false,
      isLoadingMembers: false,
    });
  },
}));
