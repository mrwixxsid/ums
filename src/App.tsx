import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import FeatureGate from "@/components/auth/FeatureGate";
import ScrollToTop from "@/components/ScrollToTop";
import { ENABLE_MANAGER_ROLE } from "@/lib/featureFlags";

import LoginPage from "./pages/auth/LoginPage";
import SignUpPage from "./pages/auth/SignUpPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import RoleRedirect from "./pages/RoleRedirect";
import PendingPage from "./pages/PendingPage";
import NotFound from "./pages/NotFound";

// Public
import PublicLayout from "@/components/layout/PublicLayout";
import HomePage from "./pages/public/HomePage";
import DepartmentsPage from "./pages/public/DepartmentsPage";
import FacultyPage from "./pages/public/FacultyPage";
import FacultyProfilePage from "./pages/public/FacultyProfilePage";
import NoticesPage from "./pages/public/NoticesPage";
import ExamSchedulePage from "./pages/public/ExamSchedulePage";
import LeadershipPage from "./pages/public/LeadershipPage";

// Admin
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDepartments from "./pages/admin/AdminDepartments";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminSchedule from "./pages/admin/AdminSchedule";
import AdminExams from "./pages/admin/AdminExams";
import AdminResults from "./pages/admin/AdminResults";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminRooms from "./pages/admin/AdminRooms";
import AdminRoutine from "./pages/admin/AdminRoutine";
import AdminCoursesDept from "./pages/admin/AdminCoursesDept";
import AdminBatches from "./pages/admin/AdminBatches";
import AdminFeatureControl from "./pages/admin/AdminFeatureControl";

// Teacher
import TeacherLayout from "./pages/teacher/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherSchedule from "./pages/teacher/TeacherSchedule";
import TeacherAssessments from "./pages/teacher/TeacherAssessments";
import TeacherNotes from "./pages/teacher/TeacherNotes";
import TeacherRequests from "./pages/teacher/TeacherRequests";
import TeacherResults from "./pages/teacher/TeacherResults";
import TeacherCourses from "./pages/teacher/TeacherCourses";

// Student
import StudentLayout from "./pages/student/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentCourses from "./pages/student/StudentCourses";
import StudentAttendance from "./pages/student/StudentAttendance";
import StudentSchedule from "./pages/student/StudentSchedule";
import StudentExams from "./pages/student/StudentExams";
import StudentResults from "./pages/student/StudentResults";
import StudentNotices from "./pages/student/StudentNotices";
import StudentRequests from "./pages/student/StudentRequests";
import StudentAssessments from "./pages/student/StudentAssessments";
import StudentFinalResults from "./pages/student/StudentFinalResults";

// Manager (conditionally used — files can be deleted when ENABLE_MANAGER_ROLE is false)
import ManagerLayout from "./pages/manager/ManagerLayout";

// Shared
import ProfilePage from "./pages/shared/ProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* Public website */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/faculty" element={<FacultyPage />} />
              <Route path="/faculty/:id" element={<FacultyProfilePage />} />
              <Route path="/notices-public" element={<NoticesPage />} />
              <Route path="/exam-schedule" element={<ExamSchedulePage />} />
              <Route path="/leadership" element={<LeadershipPage />} />
            </Route>

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/pending" element={<PendingPage />} />
            <Route path="/portal" element={<RoleRedirect />} />

            {/* Super Admin */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="departments" element={
                <FeatureGate visKey="vis_admin_departments" redirectTo="/admin">
                  <AdminDepartments />
                </FeatureGate>
              } />
              <Route path="teachers" element={
                <FeatureGate visKey="vis_admin_teachers" redirectTo="/admin">
                  <AdminTeachers />
                </FeatureGate>
              } />
              <Route path="students" element={
                <FeatureGate visKey="vis_admin_students" redirectTo="/admin">
                  <AdminStudents />
                </FeatureGate>
              } />
              <Route path="courses" element={
                <FeatureGate visKey="vis_admin_courses" redirectTo="/admin">
                  <AdminCourses />
                </FeatureGate>
              } />
              <Route path="courses/:deptId" element={
                <FeatureGate visKey="vis_admin_courses" redirectTo="/admin">
                  <AdminCoursesDept />
                </FeatureGate>
              } />
              <Route path="batches" element={
                <FeatureGate visKey="vis_admin_batches" redirectTo="/admin">
                  <AdminBatches />
                </FeatureGate>
              } />
              <Route path="rooms" element={
                <FeatureGate visKey="vis_admin_rooms" redirectTo="/admin">
                  <AdminRooms />
                </FeatureGate>
              } />
              <Route path="routine" element={
                <FeatureGate visKey="vis_admin_routine" redirectTo="/admin">
                  <AdminRoutine />
                </FeatureGate>
              } />
              <Route path="notices" element={
                <FeatureGate visKey="vis_admin_notices" redirectTo="/admin">
                  <AdminNotices />
                </FeatureGate>
              } />
              <Route path="schedule" element={
                <FeatureGate visKey="vis_admin_schedule" redirectTo="/admin">
                  <AdminSchedule />
                </FeatureGate>
              } />
              <Route path="exams" element={
                <FeatureGate visKey="vis_admin_exams" redirectTo="/admin">
                  <AdminExams />
                </FeatureGate>
              } />
              <Route path="results" element={
                <FeatureGate visKey="vis_admin_results" redirectTo="/admin">
                  <AdminResults />
                </FeatureGate>
              } />
              <Route path="settings" element={
                <FeatureGate visKey="vis_admin_settings" redirectTo="/admin">
                  <AdminSettings />
                </FeatureGate>
              } />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Manager — only registered when ENABLE_MANAGER_ROLE is true */}
            {ENABLE_MANAGER_ROLE && ManagerLayout && (
              <Route path="/manager" element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <ManagerLayout />
                </ProtectedRoute>
              }>
                <Route index element={<AdminFeatureControl />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            )}

            {/* Teacher */}
            <Route path="/teacher" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherLayout />
              </ProtectedRoute>
            }>
              <Route index element={<TeacherDashboard />} />
              <Route path="courses" element={
                <FeatureGate visKey="vis_teacher_courses" redirectTo="/teacher">
                  <TeacherCourses />
                </FeatureGate>
              } />
              <Route path="attendance" element={
                <FeatureGate visKey="vis_teacher_attendance" redirectTo="/teacher">
                  <TeacherAttendance />
                </FeatureGate>
              } />
              <Route path="schedule" element={
                <FeatureGate visKey="vis_teacher_schedule" redirectTo="/teacher">
                  <TeacherSchedule />
                </FeatureGate>
              } />
              <Route path="assessments" element={
                <FeatureGate visKey="vis_teacher_assessments" redirectTo="/teacher">
                  <TeacherAssessments />
                </FeatureGate>
              } />
              <Route path="notes" element={
                <FeatureGate visKey="vis_teacher_notes" redirectTo="/teacher">
                  <TeacherNotes />
                </FeatureGate>
              } />
              <Route path="requests" element={
                <FeatureGate visKey="vis_teacher_requests" redirectTo="/teacher">
                  <TeacherRequests />
                </FeatureGate>
              } />
              <Route path="results" element={
                <FeatureGate visKey="vis_teacher_results" redirectTo="/teacher">
                  <TeacherResults />
                </FeatureGate>
              } />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Student */}
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route index element={<StudentDashboard />} />
              <Route path="courses" element={
                <FeatureGate visKey="vis_student_courses" redirectTo="/student">
                  <StudentCourses />
                </FeatureGate>
              } />
              <Route path="attendance" element={
                <FeatureGate visKey="vis_student_attendance" redirectTo="/student">
                  <StudentAttendance />
                </FeatureGate>
              } />
              <Route path="schedule" element={
                <FeatureGate visKey="vis_student_schedule" redirectTo="/student">
                  <StudentSchedule />
                </FeatureGate>
              } />
              <Route path="exams" element={
                <FeatureGate visKey="vis_student_exams" redirectTo="/student">
                  <StudentExams />
                </FeatureGate>
              } />
              <Route path="results" element={
                <FeatureGate visKey="vis_student_results" redirectTo="/student">
                  <StudentResults />
                </FeatureGate>
              } />
              <Route path="assessments" element={
                <FeatureGate visKey="vis_student_assessments" redirectTo="/student">
                  <StudentAssessments />
                </FeatureGate>
              } />
              <Route path="final-results" element={
                <FeatureGate visKey="vis_student_final_results" redirectTo="/student">
                  <StudentFinalResults />
                </FeatureGate>
              } />
              <Route path="notices" element={
                <FeatureGate visKey="vis_student_notices" redirectTo="/student">
                  <StudentNotices />
                </FeatureGate>
              } />
              <Route path="requests" element={
                <FeatureGate visKey="vis_student_requests" redirectTo="/student">
                  <StudentRequests />
                </FeatureGate>
              } />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
