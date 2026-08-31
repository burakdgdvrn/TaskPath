import { create } from 'zustand';
import { apiLogin, apiRegister, apiGetMe, apiListUsers } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('taskpath_user') || 'null'),
  users: [],
  isAuthenticated: !!localStorage.getItem('taskpath_token'),
  error: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await apiLogin(email, password);
      localStorage.setItem('taskpath_token', data.access_token);
      const userData = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        displayName: data.user.display_name,
        avatarColor: data.user.avatar_color,
        avatar_base64: data.user.avatar_base64,
      };
      localStorage.setItem('taskpath_user', JSON.stringify(userData));
      set({ user: userData, isAuthenticated: true, loading: false });
      // Load all users after login
      get().loadUsers();
      return true;
    } catch (err) {
      set({ error: err.message || 'Giriş başarısız', loading: false });
      return false;
    }
  },

  register: async (email, displayName, password) => {
    set({ loading: true, error: null });
    try {
      const data = await apiRegister(email, displayName, password);
      localStorage.setItem('taskpath_token', data.access_token);
      const userData = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        displayName: data.user.display_name,
        avatarColor: data.user.avatar_color,
        avatar_base64: data.user.avatar_base64,
      };
      localStorage.setItem('taskpath_user', JSON.stringify(userData));
      set({ user: userData, isAuthenticated: true, loading: false });
      get().loadUsers();
      return true;
    } catch (err) {
      set({ error: err.message || 'Kayıt başarısız', loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('taskpath_user');
    localStorage.removeItem('taskpath_token');
    set({ user: null, users: [], isAuthenticated: false, error: null });
  },

  loadUsers: async () => {
    try {
      const users = await apiListUsers();
      set({
        users: users.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          displayName: u.display_name,
          avatarColor: u.avatar_color,
          avatar_base64: u.avatar_base64,
        })),
      });
    } catch {
      // Silent fail — users list is non-critical
    }
  },

  // Verify token on app load
  verifyToken: async () => {
    const token = localStorage.getItem('taskpath_token');
    if (!token) return;
    try {
      const data = await apiGetMe();
      const userData = {
        id: data.id,
        username: data.username,
        email: data.email,
        displayName: data.display_name,
        avatarColor: data.avatar_color,
        avatar_base64: data.avatar_base64,
      };
      localStorage.setItem('taskpath_user', JSON.stringify(userData));
      set({ user: userData, isAuthenticated: true });
      get().loadUsers();
    } catch {
      // Token expired
      localStorage.removeItem('taskpath_user');
      localStorage.removeItem('taskpath_token');
      set({ user: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),

  updateLocalUser: (data) => {
    const currentUser = get().user;
    if (!currentUser) return;
    
    const updatedUser = { ...currentUser, ...data };
    localStorage.setItem('taskpath_user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },
}));

export default useAuthStore;
