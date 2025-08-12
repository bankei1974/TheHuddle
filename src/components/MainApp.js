import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { db } from '../firebase';
import NewStaffSchedulingPage from './NewStaffSchedulingPage';
import NewManagerSchedulingPage from './NewManagerSchedulingPage';
import StaffAndUnitManagementPage from './StaffAndUnitManagementPage';
import StaffManagementPage from './StaffManagementPage';
import ReportsPage from './ReportsPage';
import AIInsightsPage from './AIInsightsPage';
import StaffProfilePage from './StaffProfilePage';
import StaffFormPage from './StaffFormPage';
import HelpOutHubPage from './HelpOutHubPage';
import StaffKarmaPage from './StaffKarmaPage';
import HappeningHubPage from './HappeningHubPage';
import PrintHubPage from './PrintHubPage';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Users, CalendarDays, BarChart2, Sparkles, LogOut, ChevronsLeft, ChevronsRight, TrendingUp, Handshake, Printer } from 'lucide-react';
import { doc, updateDoc, collection, addDoc, where } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import PendingSurveysModal from './PendingSurveysModal';
import WorkloadRatingModal from './WorkloadRatingModal';
import WeeklyCheckinModal from './WeeklyCheckinModal';

const MainAppContent = () => {
    const { user: currentUser, userProfile, logout } = useAuthContext();
    const isManager = userProfile.role === 'Manager';
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const onSignOut = logout;
    const location = useLocation();
    const navigate = useNavigate();

    const [isPendingSurveysModalOpen, setIsPendingSurveysModalOpen] = useState(false);
    const [pendingDaily, setPendingDaily] = useState([]);
    const [pendingWeekly, setPendingWeekly] = useState(false);
    const [selectedShiftForSurvey, setSelectedShiftForSurvey] = useState(null);
    const [isWorkloadModalOpen, setIsWorkloadModalOpen] = useState(false);
    const [isWeeklyCheckinModalOpen, setIsWeeklyCheckinModalOpen] = useState(false);

    const { data: shifts } = useCollection(db, 'shifts', userProfile?.id ? [where("staffId", "==", userProfile.id)] : []);
    const { data: weeklyCheckins } = useCollection(db, 'weeklyCheckins', userProfile?.id ? [where("staffId", "==", userProfile.id)] : []);

    const handleViewProfile = (staffId) => {
        setSelectedStaffId(staffId);
        navigate(`/staff-profile/${staffId}`);
    };

    useEffect(() => {
        // Daily Staff Karma for login/viewing schedule
        if (userProfile && currentUser) {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            if (userProfile.lastLoginDate !== today) {
                const userRef = doc(db, 'users', userProfile.id);
                const newKarma = (userProfile.staffKarma || 0) + 1;
                console.log("Attempting to update user profile:", {
                    currentUserUid: currentUser.uid,
                    userProfileId: userProfile.id,
                    userProfileRole: userProfile.role,
                    newKarma: newKarma,
                    lastLoginDate: today,
                });
                updateDoc(userRef, {
                    staffKarma: newKarma,
                    lastLoginDate: today,
                }).then(() => {
                    console.log("User profile updated successfully. Attempting to add karma transaction:", {
                        staffId: userProfile.id,
                        date: today,
                        karmaChange: 1,
                        reason: 'Daily Login',
                        transactionType: 'Award',
                        timestamp: new Date(),
                    });
                    // Log the karma transaction
                    addDoc(collection(db, 'karmaTransactions'), {
                        staffId: userProfile.id,
                        date: today,
                        karmaChange: 1,
                        reason: 'Daily Login',
                        transactionType: 'Award',
                        timestamp: new Date(),
                    });
                }).catch(error => console.error("Error updating staff karma for daily login:", error));
            }
        }
    }, [userProfile, currentUser]);

    useEffect(() => {
        if (userProfile && shifts && weeklyCheckins) {
            const isEligible = userProfile.jobTitle === 'Registered Nurse' || userProfile.jobTitle === 'LPN';
            if (!isEligible) return;

            // Check for pending daily surveys
            const today = new Date();
            const pending = shifts.filter(s => {
                const shiftDate = new Date(s.shiftEndDateTime || s.endTime?.toDate());
                return shiftDate < today && s.status?.includes('Productive') && !s.workloadRating;
            });
            setPendingDaily(pending);

            // Check for pending weekly survey
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const lastWeekCheckin = weeklyCheckins.find(c => new Date(c.weekStartDate) > oneWeekAgo);
            if (!lastWeekCheckin) {
                setPendingWeekly(true);
            } else {
                setPendingWeekly(false);
            }

            if (pending.length > 0 || !lastWeekCheckin) {
                setIsPendingSurveysModalOpen(true);
            }
        }
    }, [userProfile, shifts, weeklyCheckins]);

    const handleCloseModal = () => {
        setIsPendingSurveysModalOpen(false);
    };

    const handleCompleteDailySurvey = (shift) => {
        setSelectedShiftForSurvey(shift);
        setIsWorkloadModalOpen(true);
        setIsPendingSurveysModalOpen(false);
    };

    const handleCompleteWeeklySurvey = () => {
        setIsWeeklyCheckinModalOpen(true);
        setIsPendingSurveysModalOpen(false);
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            <aside className={`bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0 p-4 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
                <div className="p-4 text-2xl font-bold text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="https://firebasestorage.googleapis.com/v0/b/gemini-app-2-97a7d.firebasestorage.app/o/Gemini_Generated_Image_a0oe30a0oe30a0oe%20(1).png?alt=media&token=4967f007-3f9c-4b3d-a1d4-b1cf21a20a88" alt="Logo" className="w-16 h-16" />
                        {!isSidebarCollapsed && <span>The Huddle</span>}
                    </div>
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="text-gray-400 hover:text-white">
                        {isSidebarCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
                    </button>
                </div>
                <nav className="flex-1 space-y-2 mt-8">
                    {isManager ? (
                        <>
                            <Link to="/management" className={`nav-link ${location.pathname === '/management' ? 'active' : ''}`}><Users /> {!isSidebarCollapsed && "Central Hub"}</Link>
                            <Link to="/staff-management" className={`nav-link ${location.pathname === '/staff-management' ? 'active' : ''}`}><Users /> {!isSidebarCollapsed && "Staff Hub"}</Link>
                            <Link to="/scheduling" className={`nav-link ${location.pathname === '/scheduling' ? 'active' : ''}`}><CalendarDays /> {!isSidebarCollapsed && "Schedule Hub"}</Link>
                            <Link to="/reports" className={`nav-link ${location.pathname === '/reports' ? 'active' : ''}`}><BarChart2 /> {!isSidebarCollapsed && "Reports Hub"}</Link>
                            <Link to="/ai-insights" className={`nav-link ${location.pathname === '/ai-insights' ? 'active' : ''}`}><Sparkles /> {!isSidebarCollapsed && "Insights Hub"}</Link>
                            <Link to="/help-out-hub" className={`nav-link ${location.pathname === '/help-out-hub' ? 'active' : ''}`}><Handshake /> {!isSidebarCollapsed && "Help Hub"}</Link>
                            <Link to="/happening-hub" className={`nav-link ${location.pathname === '/happening-hub' ? 'active' : ''}`}><TrendingUp /> {!isSidebarCollapsed && "Happening Hub"}</Link>
                            <Link to="/print-hub" className={`nav-link ${location.pathname === '/print-hub' ? 'active' : ''}`}><Printer /> {!isSidebarCollapsed && "Print Hub"}</Link>
                        </>
                    ) : (
                        <>
                            <Link to="/my-schedule" className={`nav-link ${location.pathname === '/my-schedule' ? 'active' : ''}`}><CalendarDays /> {!isSidebarCollapsed && "My Schedule"}</Link>
                            <Link to="/help-out-hub" className={`nav-link ${location.pathname === '/help-out-hub' ? 'active' : ''}`}><Handshake /> {!isSidebarCollapsed && "Help Hub"}</Link>
                            <Link to="/my-karma" className={`nav-link ${location.pathname === '/my-karma' ? 'active' : ''}`}><Sparkles /> {!isSidebarCollapsed && "My Karma"}</Link>
                            <Link to="/happening-hub" className={`nav-link ${location.pathname === '/happening-hub' ? 'active' : ''}`}><TrendingUp /> {!isSidebarCollapsed && "Happening Hub"}</Link>
                            <Link to={`/my-profile/${userProfile.id}`} className={`nav-link ${location.pathname === `/my-profile/${userProfile.id}` ? 'active' : ''}`}><Users /> {!isSidebarCollapsed && "Profile Hub"}</Link>
                        </>
                    )}
                </nav>
                <div className="mt-auto">
                    <button onClick={onSignOut} title={isSidebarCollapsed ? "Sign Out" : ""} className="flex items-center gap-4 w-full px-4 py-3 text-lg font-semibold text-gray-400 hover:bg-gray-700/50 hover:text-white rounded-xl">
                        <LogOut /> {!isSidebarCollapsed && "Sign Out"}
                    </button>
                </div>
            </aside>
            <div className="flex-1 flex flex-col overflow-auto">
                <Routes>
                    <Route path="/" element={isManager ? <Navigate to="/management" replace /> : <Navigate to="/my-schedule" replace />} />
                    <Route path="/management" element={<StaffAndUnitManagementPage />} />
                    <Route path="/staff-management" element={<StaffManagementPage onViewProfile={handleViewProfile} />} />
                    <Route path="/staff-profile/:staffId" element={<StaffProfilePage />} />
                    <Route path="/scheduling" element={<NewManagerSchedulingPage onViewProfile={handleViewProfile} />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/ai-insights" element={<AIInsightsPage />} />
                    <Route path="/help-out-hub" element={<HelpOutHubPage />} />
                    <Route path="/happening-hub" element={<HappeningHubPage />} />
                    <Route path="/print-hub" element={<PrintHubPage />} />
                    <Route path="/my-schedule" element={<NewStaffSchedulingPage />} />
                    <Route path="/staff-form/:staffId" element={<StaffFormPage />} />
                    <Route path="/my-karma" element={<StaffKarmaPage />} />
                    <Route path="/my-profile/:staffId" element={<StaffProfilePage />} />
                </Routes>
            </div>
            <PendingSurveysModal
                isOpen={isPendingSurveysModalOpen}
                onClose={handleCloseModal}
                pendingDaily={pendingDaily}
                pendingWeekly={pendingWeekly}
                userProfile={userProfile}
                onCompleteDaily={handleCompleteDailySurvey}
                onCompleteWeekly={handleCompleteWeeklySurvey}
            />
            {isWorkloadModalOpen && (
                <WorkloadRatingModal
                    isOpen={isWorkloadModalOpen}
                    onClose={() => setIsWorkloadModalOpen(false)}
                    shift={selectedShiftForSurvey}
                    userProfile={userProfile}
                />
            )}
            {isWeeklyCheckinModalOpen && (
                <WeeklyCheckinModal
                    isOpen={isWeeklyCheckinModalOpen}
                    onClose={() => setIsWeeklyCheckinModalOpen(false)}
                    userProfile={userProfile}
                />
            )}
            <style>{`.input-style { background-color: #374151 !important; border: 1px solid #4B5563; border-radius: 0.5rem; padding: 0.75rem 1rem; width: 100%; color: white; } input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active { color: white; -webkit-text-fill-color: white; -webkit-box-shadow: 0 0 0 30px #374151 inset !important; box-shadow: 0 0 0 30px #374151 inset !important; } .login-input { color: white; } .login-input input { color: white; } .input-style::placeholder { color: #D1D5DB; } .input-style:focus { outline: none; ring: 2px; ring-color: #3B82F6; } .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #D1D5DB; margin-bottom: 0.25rem; } .btn-primary { padding: 0.5rem 1rem; background-color: #2563EB; border-radius: 0.5rem; font-weight: 600; transition: background-color 0.2s; } .btn-primary:hover { background-color: #1D4ED8; } .btn-secondary { padding: 0.5rem 1rem; background-color: #4B5563; border-radius: 0.5rem; font-weight: 600; transition: background-color 0.2s; } .btn-secondary:hover { background-color: #6B7280; } .btn-danger { padding: 0.5rem 1rem; background-color: #DC2626; color: white; border-radius: 0.5rem; font-weight: 600; transition: background-color 0.2s; } .btn-danger:hover { background-color: #B91C1C; } .nav-link { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; font-size: 1.125rem; font-weight: 600; color: #9CA3AF; border-radius: 0.75rem; transition: background-color 0.2s, color 0.2s; } .nav-link:hover { background-color: #374151; color: white; } .nav-link.active { background-color: #1D4ED8; color: white; }`}</style>
        </div>
    );
};

const MainApp = () => (
    <Router>
        <MainAppContent />
    </Router>
);

export default MainApp;
