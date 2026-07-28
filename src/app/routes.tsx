import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { ProfileCompletionGate } from "@/app/ProfileCompletionGate";
import { RoleRoute } from "@/app/RoleRoute";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/app/pages/LoginPage";
import { SignupPage } from "@/app/pages/SignupPage";
import { ForgotPasswordPage } from "@/app/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/app/pages/ResetPasswordPage";
import { OrgSetupPage } from "@/app/pages/OrgSetupPage";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { NotFoundPage } from "@/app/pages/NotFoundPage";

import { EmployeesPage } from "@/features/employees/pages/EmployeesPage";
import { BulkImportPage } from "@/features/employees/pages/BulkImportPage";
import { CompleteProfilePage } from "@/features/employees/pages/CompleteProfilePage";

import { ProjectsPage } from "@/features/projects/pages/ProjectsPage";
import { ProjectDetailPage } from "@/features/projects/pages/ProjectDetailPage";

import { ApprovalsPage } from "@/features/allocations/pages/ApprovalsPage";
import { ExpertiseSearchPage } from "@/features/allocations/pages/ExpertiseSearchPage";

import { ReleaseCalendarPage } from "@/features/release-planning/pages/ReleaseCalendarPage";

import { ReportingPage } from "@/features/reporting/pages/ReportingPage";

import { POCsPage } from "@/features/pocs/pages/POCsPage";
import { POCDetailPage } from "@/features/pocs/pages/POCDetailPage";

import { NotificationList } from "@/features/notifications/components/NotificationList";
import { LandingPage } from "@/features/marketing/pages/LandingPage";

function Shell({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/org-setup", element: <OrgSetupPage /> },
      {
        element: <ProfileCompletionGate />,
        children: [
          { path: "/complete-profile", element: <Shell><CompleteProfilePage /></Shell> },
          { path: "/dashboard", element: <Shell><DashboardPage /></Shell> },

          {
            path: "/employees",
            element: <RoleRoute allow={["admin"]} />,
            children: [
              { index: true, element: <Shell><EmployeesPage /></Shell> },
              { path: "bulk-import", element: <Shell><BulkImportPage /></Shell> },
            ],
          },

          { path: "/projects", element: <Shell><ProjectsPage /></Shell> },
          { path: "/projects/:id", element: <Shell><ProjectDetailPage /></Shell> },

          { path: "/expertise-search", element: <Shell><ExpertiseSearchPage /></Shell> },

          {
            path: "/approvals",
            element: <RoleRoute allow={["admin", "resource_manager"]} />,
            children: [{ index: true, element: <Shell><ApprovalsPage /></Shell> }],
          },

          { path: "/release-calendar", element: <Shell><ReleaseCalendarPage /></Shell> },

          { path: "/reporting", element: <Shell><ReportingPage /></Shell> },

          {
            path: "/pocs",
            element: <RoleRoute allow={["admin", "sales_lead"]} />,
            children: [
              { index: true, element: <Shell><POCsPage /></Shell> },
              { path: ":id", element: <Shell><POCDetailPage /></Shell> },
            ],
          },

          { path: "/notifications", element: <Shell><NotificationList /></Shell> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
