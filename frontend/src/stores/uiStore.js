import { create } from 'zustand';

const initialTheme = localStorage.getItem('taskpath_theme') || 'dark';
document.documentElement.setAttribute('data-theme', initialTheme);

const useUIStore = create((set) => ({
  sidebarOpen: true,
  createBoardModalOpen: false,
  createNodeModalOpen: false,
  newNodePosition: null,
  profileModalOpen: false,
  commandPaletteOpen: false,
  isChatOpen: false,
  activeChatId: null,
  unreadChatCounts: {},

  // Confirm Modal
  confirmModalOpen: false,
  confirmConfig: null,

  // Workspace Modals
  createWorkspaceModalOpen: false,
  createProjectModalOpen: false,
  inviteMemberModalOpen: false,
  inboxModalOpen: false,

  // Onboarding
  onboardingModalOpen: false,

  theme: initialTheme,

  toggleTheme: () => set(state => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('taskpath_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    return { theme: newTheme };
  }),

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openCreateBoardModal: () => set({ createBoardModalOpen: true }),
  closeCreateBoardModal: () => set({ createBoardModalOpen: false }),

  openCreateNodeModal: (position) => set({ createNodeModalOpen: true, newNodePosition: position }),
  closeCreateNodeModal: () => set({ createNodeModalOpen: false, newNodePosition: null }),

  openProfileModal: () => set({ profileModalOpen: true }),
  closeProfileModal: () => set({ profileModalOpen: false }),

  // Workspace Modal Actions
  openCreateWorkspaceModal: () => set({ createWorkspaceModalOpen: true }),
  closeCreateWorkspaceModal: () => set({ createWorkspaceModalOpen: false }),
  openCreateProjectModal: () => set({ createProjectModalOpen: true }),
  closeCreateProjectModal: () => set({ createProjectModalOpen: false }),
  openInviteMemberModal: () => set({ inviteMemberModalOpen: true }),
  closeInviteMemberModal: () => set({ inviteMemberModalOpen: false }),
  openInboxModal: () => set({ inboxModalOpen: true }),
  closeInboxModal: () => set({ inboxModalOpen: false }),

  toggleCommandPalette: () => set(state => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  // Onboarding
  openOnboardingModal: () => set({ onboardingModalOpen: true }),
  closeOnboardingModal: () => set({ onboardingModalOpen: false }),

  toggleChat: () => set(state => {
    return { isChatOpen: !state.isChatOpen };
  }),
  closeChat: () => set({ isChatOpen: false, activeChatId: null }),
  setActiveChatId: (id) => set({ activeChatId: id }),
  incrementUnreadChat: (chatId) => set(state => {
    if (state.isChatOpen && state.activeChatId === chatId) {
      return {}; // User is actively looking at this chat
    }
    const current = state.unreadChatCounts[chatId] || 0;
    return { unreadChatCounts: { ...state.unreadChatCounts, [chatId]: current + 1 } };
  }),
  clearUnreadChat: (chatId) => set(state => {
    if (!chatId) return { unreadChatCounts: {} }; // Clear all if no ID
    const newCounts = { ...state.unreadChatCounts };
    delete newCounts[chatId];
    return { unreadChatCounts: newCounts };
  }),

  // Confirm Actions
  openConfirmModal: (config) => set({ confirmModalOpen: true, confirmConfig: config }),
  closeConfirmModal: () => set({ confirmModalOpen: false, confirmConfig: null }),
}));

export default useUIStore;
