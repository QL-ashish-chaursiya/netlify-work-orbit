import { create } from "zustand";
import type { UserRole } from "@/lib/database.types";

// Pure UI state only — no server data. Server data (session, profile, roles)
// lives in TanStack Query via useAuthSession/useAuthRole (features/auth).
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  activeRoleView: UserRole | null;
  setActiveRoleView: (role: UserRole | null) => void;

  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;

  wizardStep: number;
  setWizardStep: (step: number) => void;
  resetWizard: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  activeRoleView: null,
  setActiveRoleView: (role) => set({ activeRoleView: role }),

  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  wizardStep: 0,
  setWizardStep: (step) => set({ wizardStep: step }),
  resetWizard: () => set({ wizardStep: 0 }),
}));
