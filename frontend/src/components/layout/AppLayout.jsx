import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import ProfileSettingsModal from '../profile/ProfileSettingsModal';
import CreateWorkspaceModal from '../workspace/CreateWorkspaceModal';
import CreateProjectModal from '../workspace/CreateProjectModal';
import InviteMemberModal from '../workspace/InviteMemberModal';
import InboxModal from '../workspace/InboxModal';
import GlobalChatWidget from '../chat/GlobalChatWidget';
import OnboardingModal from './OnboardingModal';
import useUIStore from '../../stores/uiStore';
import useSocket from '../../hooks/useSocket';
import { useEffect } from 'react';

export default function AppLayout() {
  useSocket();
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  const profileModalOpen = useUIStore(s => s.profileModalOpen);
  
  const createWorkspaceModalOpen = useUIStore(s => s.createWorkspaceModalOpen);
  const closeCreateWorkspaceModal = useUIStore(s => s.closeCreateWorkspaceModal);
  
  const createProjectModalOpen = useUIStore(s => s.createProjectModalOpen);
  const closeCreateProjectModal = useUIStore(s => s.closeCreateProjectModal);
  
  const inviteMemberModalOpen = useUIStore(s => s.inviteMemberModalOpen);
  const closeInviteMemberModal = useUIStore(s => s.closeInviteMemberModal);
  
  const inboxModalOpen = useUIStore(s => s.inboxModalOpen);
  const closeInboxModal = useUIStore(s => s.closeInboxModal);

  const onboardingModalOpen = useUIStore(s => s.onboardingModalOpen);
  const closeOnboardingModal = useUIStore(s => s.closeOnboardingModal);
  const openOnboardingModal = useUIStore(s => s.openOnboardingModal);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('taskpath_has_seen_onboarding');
    if (!hasSeenOnboarding) {
      openOnboardingModal();
      localStorage.setItem('taskpath_has_seen_onboarding', 'true');
    }
  }, [openOnboardingModal]);

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <>
          <div className="sidebar-overlay" onClick={() => useUIStore.getState().toggleSidebar()} />
          <Sidebar />
        </>
      )}
      {/* Global Chat Widget */}
      <GlobalChatWidget />
      <div className="app-main">
        <TopBar />
        <div className="app-content">
          <Outlet />
        </div>
      </div>
      <CommandPalette />
      {profileModalOpen && <ProfileSettingsModal />}
      {createWorkspaceModalOpen && <CreateWorkspaceModal onClose={closeCreateWorkspaceModal} />}
      {createProjectModalOpen && <CreateProjectModal onClose={closeCreateProjectModal} />}
      {inviteMemberModalOpen && <InviteMemberModal onClose={closeInviteMemberModal} />}
      {inboxModalOpen && <InboxModal onClose={closeInboxModal} />}
      
      {/* Onboarding */}
      <OnboardingModal isOpen={onboardingModalOpen} onClose={closeOnboardingModal} />
    </div>
  );
}
