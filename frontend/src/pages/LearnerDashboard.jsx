import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { courseService, progressService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
    LayoutDashboard, BookOpen, Clock, Activity, User,
    LogOut, CheckCircle, ArrowRight, PlayCircle
} from "lucide-react";

export const LearnerDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [progressMap, setProgressMap] = useState({}); // { courseId: { is_completed, playback_position } }
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("dashboard");

    useEffect(() => {
        const loadData = async () => {
            try {
                const coursesData = await courseService.getLearnerCourses();
                setCourses(coursesData);

                // Fetch progress for each course
                const progData = {};
                await Promise.all(coursesData.map(async (course) => {
                    try {
                        const p = await progressService.getProgress(course.id);
                        if (p) progData[course.id] = p;
                    } catch (e) {
                        console.warn(`Could not load progress for course ${course.id}`, e);
                    }
                }));
                setProgressMap(progData);

            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const handleCourseClick = (courseId) => {
        navigate(`/learner/courses/${courseId}`);
    };

    // --- Sub-components for Views ---

    const StatsSection = () => {
        const totalCourses = courses.length;
        let completedCourses = 0;
        let inProgressCourses = 0;
        courses.forEach(c => {
            const prog = progressMap[c.id];
            if (prog?.is_completed) completedCourses++;
            else inProgressCourses++;
        });
        const avgScore = 85; // Mock

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {[
                    { label: "Total Assigned", value: totalCourses, color: "bg-blue-50 text-blue-600", icon: BookOpen },
                    { label: "Completed", value: completedCourses, color: "bg-green-50 text-green-600", icon: CheckCircle },
                    { label: "In Progress", value: inProgressCourses, color: "bg-orange-50 text-orange-600", icon: Clock },
                    { label: "Avg. Score", value: `${avgScore}%`, color: "bg-purple-50 text-purple-600", icon: Activity },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+2.5%</span>
                        </div>
                        <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                    </div>
                ))}
            </div>
        );
    };

    const CoursesGrid = ({ limit = null }) => {
        const displayCourses = limit ? courses.slice(0, limit) : courses;

        if (courses.length === 0) {
            return (
                <div className="bg-white p-16 rounded-3xl shadow-sm border border-gray-100 border-dashed text-center">
                    <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No courses assigned yet</h3>
                    <p className="text-gray-500">Wait for your admin to assign new materials.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {displayCourses.map((course) => {
                    const prog = progressMap[course.id];
                    const isComplete = prog?.is_completed;
                    const progressVal = prog ? Math.round((prog.playback_position || 0) * 100) : 0;

                    let statusLabel = "Not Started";
                    let statusColor = "bg-gray-100 text-gray-600";

                    if (isComplete) {
                        statusLabel = "Completed";
                        statusColor = "bg-green-100 text-green-700";
                    } else if (progressVal > 0) {
                        statusLabel = "In Progress";
                        statusColor = "bg-orange-100 text-orange-700";
                    }

                    return (
                        <div
                            key={course.id}
                            onClick={() => handleCourseClick(course.id)}
                            className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
                        >
                            <div className="h-44 bg-gray-100 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-90 group-hover:scale-105 transition-transform duration-500"></div>
                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                                <div className="absolute top-4 right-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${statusColor} bg-white/90 backdrop-blur-sm`}>
                                        {statusLabel}
                                    </span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 text-white">
                                    <p className="text-xs font-medium opacity-80 mb-1 uppercase tracking-wider">Course</p>
                                    <h3 className="text-xl font-bold leading-tight line-clamp-2">{course.title}</h3>
                                </div>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <p className="text-sm text-gray-500 line-clamp-3 mb-6 flex-1 leading-relaxed">
                                    {course.description || "No description provided. Start learning to explore the content."}
                                </p>
                                <div className="mt-auto space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wide">
                                            <span>Progress</span>
                                            <span>{isComplete ? 100 : progressVal}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${isComplete ? 100 : progressVal}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCourseClick(course.id);
                                        }}
                                        className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors ${isComplete
                                            ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                                            }`}
                                    >
                                        {isComplete ? <><CheckCircle className="w-4 h-4" /> Review Course</> : <><PlayCircle className="w-4 h-4" /> {progressVal > 0 ? "Continue Learning" : "Start Learning"}</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const PlaceholderView = ({ title, icon: Icon, message }) => (
        <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-3xl border border-gray-100 border-dashed p-8 text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                <Icon className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-500 max-w-md">{message}</p>
        </div>
    );

    // --- Main Render Content Logic ---

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <>
                        <StatsSection />
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
                                <button
                                    onClick={() => setActiveTab('courses')}
                                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                                >
                                    View All <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                            <CoursesGrid limit={3} />
                        </div>
                    </>
                );
            case 'courses':
                return (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">All Assigned Courses</h2>
                        </div>
                        <CoursesGrid />
                    </div>
                );
            case 'quizzes':
                return <PlaceholderView title="Quizzes" icon={Activity} message="Your quiz performance and history will appear here. Complete course modules to unlock more quizzes." />;
            case 'progress':
                return <PlaceholderView title="Learning Progress" icon={Clock} message="Detailed analytics about your learning journey, playback stats, and daily streaks are coming soon." />;
            case 'profile':
                return (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-2xl mx-auto">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-3xl border-4 border-white shadow-md">
                                {user?.full_name?.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{user?.full_name}</h2>
                                <p className="text-indigo-600 font-medium uppercase tracking-wide">{user?.role}</p>
                                <p className="text-gray-500 mt-1">{user?.email}</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Account Details</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase font-bold">User ID</p>
                                    <p className="font-mono text-gray-900">{user?.id}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Joined</p>
                                    <p className="text-gray-900">{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 rounded-full border-t-transparent"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-indigo-100 pb-20">
            {/* Standard Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col h-screen fixed left-0 top-0 z-10 transition-all duration-300">
                <div className="p-6 flex items-center gap-3 border-b border-gray-100">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-gray-900 text-lg tracking-tight">LearningTracker</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'courses', label: 'My Courses', icon: BookOpen },
                        { id: 'quizzes', label: 'Quizzes', icon: Activity },
                        { id: 'progress', label: 'Progress', icon: Clock },
                        { id: 'profile', label: 'Profile', icon: User },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === item.id
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </div>

            <div className="lg:pl-64 min-h-screen flex flex-col">
                {/* Mobile Header */}
                <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-gray-900">LearningTracker</span>
                    </div>
                </div>

                <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
                    {/* Common Header for all tabs */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                {activeTab === 'dashboard' ? `Welcome back, ${user?.full_name?.split(' ')[0] || "Learner"}! 👋` :
                                    activeTab === 'courses' ? 'My Courses' :
                                        activeTab === 'quizzes' ? 'Quizzes' :
                                            activeTab === 'progress' ? 'Progress' : 'My Profile'}
                            </h1>
                            <p className="text-gray-500 mt-2 text-lg">
                                {activeTab === 'dashboard' ? "Here's what's happening with your learning today." :
                                    activeTab === 'courses' ? 'Access all your assigned learning materials.' :
                                        'Manage your account and view your status.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-sm border border-gray-100">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                                {user?.full_name?.charAt(0)}
                            </div>
                            <div className="text-left hidden md:block">
                                <p className="text-sm font-bold text-gray-900">{user?.full_name}</p>
                                <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">{user?.role}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Content */}
                    <div className="animate-fade-in">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};
