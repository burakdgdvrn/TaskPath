import { create } from 'zustand';
import { 
  apiListWorkspaces, 
  apiCreateWorkspace, 
  apiUpdateWorkspace,
  apiDeleteWorkspace, 
  apiListProjects, 
  apiCreateProject, 
  apiUpdateProject,
  apiDeleteProject,
  apiListBoards,
  apiCreateBoard,
  apiDeleteBoard,
  apiListWorkspaceInvites, apiRemoveWorkspaceMember,
  apiListNotifications, apiReadNotification, apiDeleteNotification,
  apiListInvites, apiAcceptInvite, apiRejectInvite
} from '../services/api';

const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  projects: [],
  boards: [],
  invites: [],
  notifications: [],
  isLoading: false,
  isContentLoading: false,
  error: null,

  // Initialize data
  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const workspaces = await apiListWorkspaces();
      
      // Auto select first workspace if none selected
      const currentActiveId = get().activeWorkspaceId;
      let newActiveId = currentActiveId;
      
      if (!currentActiveId && workspaces.length > 0) {
        newActiveId = workspaces[0].id;
      } else if (currentActiveId && !workspaces.find(w => w.id === currentActiveId)) {
        // If currently selected workspace is gone, select the first one
        newActiveId = workspaces.length > 0 ? workspaces[0].id : null;
      }
      
      set({ workspaces, activeWorkspaceId: newActiveId, isLoading: false });
      
      // If we have an active workspace, fetch its content
      if (newActiveId) {
        await get().fetchWorkspaceContent(newActiveId);
      }
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  setActiveWorkspace: async (workspaceId) => {
    set({ activeWorkspaceId: workspaceId });
    await get().fetchWorkspaceContent(workspaceId);
  },

  fetchWorkspaceContent: async (workspaceId) => {
    set({ isContentLoading: true });
    try {
      const [projects, boards] = await Promise.all([
        apiListProjects(workspaceId),
        apiListBoards(workspaceId)
      ]);
      set({ projects, boards, isContentLoading: false });
    } catch (error) {
      console.error("Workspace content error:", error);
      set({ isContentLoading: false });
    }
  },

  createWorkspace: async (name, description) => {
    const newWs = await apiCreateWorkspace(name, description);
    await get().fetchWorkspaces();
    get().setActiveWorkspace(newWs.id);
    return newWs;
  },

  updateWorkspace: async (workspaceId, name, description) => {
    await apiUpdateWorkspace(workspaceId, { name, description });
    await get().fetchWorkspaces();
  },

  deleteWorkspace: async (workspaceId) => {
    await apiDeleteWorkspace(workspaceId);
    await get().fetchWorkspaces(); // Will auto-select another one
  },

  deleteProject: async (workspaceId, projectId) => {
    await apiDeleteProject(workspaceId, projectId);
    await get().fetchWorkspaceContent(workspaceId);
  },

  createProject: async (name, description) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return null;
    const newProject = await apiCreateProject(wsId, name, description);
    await get().fetchWorkspaceContent(wsId);
    return newProject;
  },

  updateProject: async (workspaceId, projectId, name, description) => {
    await apiUpdateProject(workspaceId, projectId, { name, description });
    await get().fetchWorkspaceContent(workspaceId);
  },

  createBoard: async (name, description, projectId = null) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return null;
    const newBoard = await apiCreateBoard(wsId, projectId, name, description);
    await get().fetchWorkspaceContent(wsId);
    return newBoard;
  },

  deleteBoard: async (workspaceId, boardId) => {
    await apiDeleteBoard(workspaceId, boardId);
    await get().fetchWorkspaceContent(workspaceId);
  },

  fetchInvites: async () => {
    try {
      const invites = await apiListInvites();
      set({ invites });
    } catch (error) {
      console.error(error);
    }
  },

  acceptInvite: async (inviteId) => {
    await apiAcceptInvite(inviteId);
    await get().fetchInvites();
    await get().fetchWorkspaces();
  },

  rejectInvite: async (inviteId) => {
    await apiRejectInvite(inviteId);
    await get().fetchInvites();
  },

  fetchNotifications: async () => {
    try {
      const notifications = await apiListNotifications();
      set({ notifications });
    } catch (error) {
      console.error('Bildirimler alınamadı', error);
    }
  },

  readNotification: async (notifId) => {
    await apiReadNotification(notifId);
    await get().fetchNotifications();
  },

  deleteNotification: async (notifId) => {
    await apiDeleteNotification(notifId);
    await get().fetchNotifications();
  }
}));

export default useWorkspaceStore;
