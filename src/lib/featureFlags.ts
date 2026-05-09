/**
 * Feature Flags
 * 
 * Toggle ENABLE_MANAGER_ROLE to false to completely disable the Manager role
 * from the application. When disabled:
 * - Manager routes will not be registered
 * - Manager role will not appear in redirects, labels, or demo credentials
 * - Manager-related files (src/pages/manager/) can be safely deleted
 * 
 * To fully remove the manager role:
 * 1. Set ENABLE_MANAGER_ROLE = false
 * 2. Delete src/pages/manager/ directory (optional cleanup)
 * 3. Remove 'manager' from app_role enum in your database (optional)
 */
export const ENABLE_MANAGER_ROLE = true;
