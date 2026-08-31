const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';
const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');

/**
 * Fetch wrapper with JWT auth
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('taskpath_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Bir hata oluştu');
  }

  return data;
}

// ──── AUTH ────

export async function apiRegister(email, displayName, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, display_name: displayName, password }),
  });
}

export async function apiLogin(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGetMe() {
  return request('/auth/me');
}

export async function apiListUsers() {
  return request('/auth/users');
}

export async function apiUpdateProfile(data) {
  return request('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function apiUpdatePassword(currentPassword, newPassword, confirmPassword) {
  return request('/auth/me/password', {
    method: 'PATCH',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });
}

export async function apiDeleteAccount(password) {
  return request('/auth/me', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

// ──── WORKSPACES ────

export async function apiListWorkspaces() {
  return request('/workspaces');
}

export async function apiCreateWorkspace(name, description = '') {
  return request('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export async function apiUpdateWorkspace(workspaceId, data) {
  return request(`/workspaces/${workspaceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteWorkspace(workspaceId) {
  return request(`/workspaces/${workspaceId}`, { method: 'DELETE' });
}

export async function apiRemoveWorkspaceMember(workspaceId, userId) {
  return request(`/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' });
}

// ──── PROJECTS ────

export async function apiListProjects(workspaceId) {
  return request(`/workspaces/${workspaceId}/projects`);
}

export async function apiCreateProject(workspaceId, name, description = '') {
  return request(`/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export async function apiUpdateProject(workspaceId, projectId, data) {
  return request(`/workspaces/${workspaceId}/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteProject(workspaceId, projectId) {
  return request(`/workspaces/${workspaceId}/projects/${projectId}`, { method: 'DELETE' });
}

// ──── BOARDS ────

export async function apiListBoards(workspaceId, projectId = null) {
  const url = projectId 
    ? `/workspaces/${workspaceId}/boards?project_id=${projectId}` 
    : `/workspaces/${workspaceId}/boards`;
  return request(url);
}

export async function apiCreateBoard(workspaceId, projectId, name, description = '') {
  return request(`/workspaces/${workspaceId}/boards`, {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, project_id: projectId, name, description }),
  });
}

export async function apiUpdateBoard(workspaceId, boardId, data) {
  return request(`/workspaces/${workspaceId}/boards/${boardId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteBoard(workspaceId, boardId) {
  return request(`/workspaces/${workspaceId}/boards/${boardId}`, { method: 'DELETE' });
}

// ──── INVITES ────

export async function apiListInvites() {
  return request('/invites/me');
}

export async function apiListWorkspaceInvites(workspaceId) {
  return request(`/invites/workspace/${workspaceId}/invites`);
}

export async function apiSendInvite(workspaceId, username) {
  return request(`/invites/workspace/${workspaceId}`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function apiAcceptInvite(inviteId) {
  return request(`/invites/${inviteId}/accept`, { method: 'POST' });
}

export async function apiRejectInvite(inviteId) {
  return request(`/invites/${inviteId}/reject`, { method: 'POST' });
}

// ──── NOTIFICATIONS ────

export async function apiListNotifications() {
  return request('/notifications');
}

export async function apiReadNotification(notificationId) {
  return request(`/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export async function apiDeleteNotification(notificationId) {
  return request(`/notifications/${notificationId}`, { method: 'DELETE' });
}

// ──── FRIENDS & CHAT ────

export async function apiListFriends() {
  return request('/friends');
}

export async function apiSendFriendRequest(receiverId) {
  return request('/friends/request', {
    method: 'POST',
    body: JSON.stringify({ receiver_id: receiverId }),
  });
}

export async function apiSendFriendRequestByUsername(username) {
  return request('/friends/request-by-username', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function apiUpdateFriendship(id, status) {
  return request(`/friends/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function apiRemoveFriend(id) {
  return request(`/friends/${id}`, { method: 'DELETE' });
}

export async function apiGetDirectMessages(friendId) {
  return request(`/chat/direct/${friendId}`);
}

export async function apiClearDirectMessages(friendId) {
  return request(`/chat/direct/${friendId}/clear`, { method: 'DELETE' });
}

export async function apiSendDirectMessage(friendId, content) {
  return request(`/chat/direct/${friendId}`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function apiGetWorkspaceMessages(workspaceId) {
  return request(`/chat/workspace/${workspaceId}`);
}

export async function apiSendWorkspaceMessage(workspaceId, content) {
  return request(`/chat/workspace/${workspaceId}`, {
    method: 'POST',
    body: JSON.stringify({ content, workspace_id: workspaceId }),
  });
}

export async function apiEditMessage(messageId, content) {
  return request(`/chat/message/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}

export async function apiDeleteMessageForEveryone(messageId) {
  return request(`/chat/message/${messageId}`, {
    method: 'DELETE',
  });
}

// ──── NODES ────

export async function apiListNodes(boardId) {
  return request(`/boards/${boardId}/nodes`);
}

export async function apiCreateNode(boardId, data) {
  return request(`/boards/${boardId}/nodes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateNode(nodeId, data) {
  return request(`/nodes/${nodeId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteNode(nodeId) {
  return request(`/nodes/${nodeId}`, { method: 'DELETE' });
}

export async function apiBulkUpdateNodes(boardId, data) {
  return request(`/boards/${boardId}/nodes/bulk`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function apiBulkDeleteNodes(boardId, data) {
  return request(`/boards/${boardId}/nodes/bulk`, {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
}

export async function apiImportRoadmap(boardId, data) {
  return request(`/boards/${boardId}/import-roadmap`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiAssignTree(boardId, nodeId, assigneeId) {
  return request(`/boards/${boardId}/nodes/${nodeId}/assign-tree`, {
    method: 'POST',
    body: JSON.stringify({ assignee_id: assigneeId }),
  });
}

// ──── EDGES ────

export async function apiListEdges(boardId) {
  return request(`/boards/${boardId}/edges`);
}

export async function apiCreateEdge(boardId, data) {
  return request(`/boards/${boardId}/edges`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiDeleteEdge(edgeId) {
  return request(`/edges/${edgeId}`, { method: 'DELETE' });
}

// ──── SEARCH ────

export async function apiSearch(query, boardId = null) {
  const params = new URLSearchParams({ q: query });
  if (boardId) params.append('board_id', boardId);
  return request(`/search?${params.toString()}`);
}

// ──── WEBSOCKET ────

export function createBoardWebSocket(boardId) {
  const token = localStorage.getItem('taskpath_token');
  if (!token) return null;
  return new WebSocket(`${WS_BASE}/ws/board/${boardId}?token=${token}`);
}
