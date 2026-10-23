import { createBrowserRouter } from 'react-router-dom'
import LoginPage from '../features/auth/LoginPage'
import ProjectListPage from '../features/projects/ProjectListPage'
import ProjectDetailPage from '../features/projects/ProjectDetailPage'
import PlanViewerPage from '../features/plan-viewer/PlanViewerPage'
import PunchListPage from '../features/punch-list/PunchListPage'
import StandardsListPage from '../features/standards/StandardsListPage'
import AuthGuard from './AuthGuard'
import AdminGuard from '../features/admin/AdminGuard'
import AdminLayout from '../features/admin/AdminLayout'
import AdminUsersPage from '../features/admin/AdminUsersPage'
import AdminProjectsPage from '../features/admin/AdminProjectsPage'
import AdminPhotosPage from '../features/admin/AdminPhotosPage'
import AdminCategoriesPage from '../features/admin/AdminCategoriesPage'
import AdminStoragePage from '../features/admin/AdminStoragePage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AuthGuard />,
    children: [
      { index: true, element: <ProjectListPage /> },
      { path: 'projects/:projectId', element: <ProjectDetailPage /> },
      { path: 'projects/:projectId/plans/:planId', element: <PlanViewerPage /> },
      { path: 'projects/:projectId/plans/:planId/punchlist', element: <PunchListPage /> },
      { path: 'standards', element: <StandardsListPage /> },
      {
        path: 'admin',
        element: <AdminGuard />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminUsersPage /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'projects', element: <AdminProjectsPage /> },
              { path: 'photos', element: <AdminPhotosPage /> },
              { path: 'categories', element: <AdminCategoriesPage /> },
              { path: 'storage', element: <AdminStoragePage /> },
            ],
          },
        ],
      },
    ],
  },
])
