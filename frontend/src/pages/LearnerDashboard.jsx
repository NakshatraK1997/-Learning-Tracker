import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { courseService, progressService, userService, quizService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
    LayoutDashboard, BookOpen, Clock, Activity, User,
    LogOut, CheckCircle, ArrowRight, PlayCircle, X, Eye
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
        const [progressStats, setProgressStats] = useState(null);

        useEffect(() => {
            const fetchStats = async () => {
                try {
                    const stats = await userService.getUserProgress();
                    setProgressStats(stats);
                } catch (error) {
                    console.error("Failed to fetch progress stats", error);
                }
            };
            fetchStats();
        }, []);

        // Fallback to local calculation if API fails
        const totalCourses = progressStats?.total_assigned || courses.length;
        const completedCourses = progressStats?.completed || 0;
        const inProgressCourses = progressStats?.in_progress || 0;
        const avgScore = progressStats?.average_score || 0;

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
                            {progressStats && <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Live</span>}
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

    const ProgressView = () => {
        const [progressStats, setProgressStats] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const fetchProgressStats = async () => {
                try {
                    const stats = await userService.getUserProgress();
                    setProgressStats(stats);
                } catch (error) {
                    console.error("Failed to fetch progress stats", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchProgressStats();
        }, []);

        if (loading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 rounded-full border-t-transparent"></div>
                </div>
            );
        }

        if (!progressStats) {
            return <PlaceholderView title="Learning Progress" icon={Clock} message="Unable to load progress data. Please try again later." />;
        }

        return (
            <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {[
                        {
                            label: "Total Assigned",
                            value: progressStats.total_assigned,
                            color: "bg-blue-50 text-blue-600",
                            icon: BookOpen,
                            subtext: "courses"
                        },
                        {
                            label: "Completed",
                            value: progressStats.completed,
                            color: "bg-green-50 text-green-600",
                            icon: CheckCircle,
                            subtext: `${progressStats.completion_percentage}% complete`
                        },
                        {
                            label: "Not Started",
                            value: progressStats.not_started,
                            color: "bg-gray-50 text-gray-600",
                            icon: PlayCircle,
                            subtext: "to begin"
                        },
                        {
                            label: "Time Spent",
                            value: `${progressStats.time_spent_hours}h`,
                            color: "bg-purple-50 text-purple-600",
                            icon: Clock,
                            subtext: "learning time"
                        },
                        {
                            label: "Learning Streak",
                            value: progressStats.learning_streak_days,
                            color: "bg-orange-50 text-orange-600",
                            icon: Activity,
                            subtext: "days active"
                        },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>
                        </div>
                    ))}
                </div>

                {/* Detailed Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quiz Performance */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            Quiz Performance
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Average Score</span>
                                <span className="text-2xl font-bold text-indigo-600">{progressStats.average_score}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                                    style={{ width: `${progressStats.average_score}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-gray-600">Quizzes Taken</span>
                                <span className="text-xl font-bold text-gray-900">{progressStats.quizzes_taken}</span>
                            </div>
                        </div>
                    </div>

                    {/* Course Progress */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-green-600" />
                            Course Progress
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Completion Rate</span>
                                <span className="text-2xl font-bold text-green-600">{progressStats.completion_percentage}%</span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mt-4">
                                <div className="text-center p-2 bg-green-50 rounded-lg">
                                    <div className="font-bold text-green-700">{progressStats.completed}</div>
                                    <div className="text-xs text-green-600 uppercase">Completed</div>
                                </div>
                                <div className="text-center p-2 bg-blue-50 rounded-lg">
                                    <div className="font-bold text-blue-700">{progressStats.in_progress}</div>
                                    <div className="text-xs text-blue-600 uppercase">In Progress</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded-lg">
                                    <div className="font-bold text-gray-700">{progressStats.not_started}</div>
                                    <div className="text-xs text-gray-600 uppercase">Not Started</div>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500"
                                    style={{ width: `${progressStats.completion_percentage}%` }}
                                ></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Completed</p>
                                    <p className="text-xl font-bold text-gray-900">{progressStats.completed}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">In Progress</p>
                                    <p className="text-xl font-bold text-gray-900">{progressStats.in_progress}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Motivational Message */}
                {progressStats.learning_streak_days > 0 && (
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-2xl border border-orange-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl">
                                🔥
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {progressStats.learning_streak_days} Day Streak!
                                </h3>
                                <p className="text-gray-600">
                                    Keep up the great work! You're building a consistent learning habit.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const QuizReviewModal = ({ submissionId, onClose }) => {
        const [submission, setSubmission] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            if (!submissionId) return;
            const fetchResult = async () => {
                setLoading(true);
                try {
                    const data = await quizService.getQuizResult(submissionId);
                    setSubmission(data);
                } catch (error) {
                    console.error("Failed to load result", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchResult();
        }, [submissionId]);

        if (!submissionId) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                        <h2 className="text-xl font-bold text-gray-900">Quiz Review</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin h-8 w-8 border-4 border-indigo-600 rounded-full border-t-transparent"></div>
                            </div>
                        ) : !submission ? (
                            <div className="text-center py-8 text-gray-500">
                                Could not load quiz details.
                            </div>
                        ) : !submission.responses || submission.responses.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Detailed responses not available for this submission.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                                    <span className="font-semibold text-gray-700">Score: {submission.score}%</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${submission.score >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {submission.score >= 70 ? 'Passed' : 'Failed'}
                                    </span>
                                </div>

                                {submission.responses.map((resp, idx) => (
                                    <div key={idx} className={`p-4 rounded-lg border ${resp.is_correct ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                                        <p className="font-medium text-gray-900 mb-3">{idx + 1}. {resp.question}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Your Answer</span>
                                                <div className={`p-2 rounded ${resp.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {resp.selected_answer}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Correct Answer</span>
                                                <div className="p-2 rounded bg-gray-100 text-gray-800">
                                                    {resp.correct_answer}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const QuizHistoryView = () => {
        const [history, setHistory] = useState([]);
        const [loading, setLoading] = useState(true);
        const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

        useEffect(() => {
            const fetchHistory = async () => {
                try {
                    const data = await quizService.getQuizHistory();
                    setHistory(data);
                } catch (error) {
                    console.error("Failed to fetch quiz history", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchHistory();
        }, []);

        if (loading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-600 rounded-full border-t-transparent"></div>
                </div>
            );
        }

        if (history.length === 0) {
            return <PlaceholderView title="No Quizzes Yet" icon={Activity} message="You haven't taken any quizzes yet. Complete course content to unlock quizzes." />;
        }

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Quiz History</h2>
                    <span className="text-sm text-gray-500">{history.length} attempts</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Quiz Title</th>
                                <th className="px-6 py-4">Course</th>
                                <th className="px-6 py-4">Score</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{item.quiz_title}</td>
                                    <td className="px-6 py-4 text-gray-600 text-sm">{item.course_title}</td>
                                    <td className="px-6 py-4">
                                        <span className={`font-bold ${item.score >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                                            {item.score}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'Passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {item.status === 'Passed' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Activity className="w-3 h-3 mr-1" />}
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {new Date(item.submitted_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedSubmissionId(item.id)}
                                            className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end w-full"
                                        >
                                            <Eye className="w-4 h-4 mr-1" /> Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Review Modal */}
                {selectedSubmissionId && (
                    <QuizReviewModal
                        submissionId={selectedSubmissionId}
                        onClose={() => setSelectedSubmissionId(null)}
                    />
                )}
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
                return <QuizHistoryView />;
            case 'progress':
                return <ProgressView />;
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
                    <img src="/logo.png" alt="Company Logo" className="w-8 h-8 rounded-lg" />
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
                        <img src="/logo.png" alt="Company Logo" className="w-8 h-8 rounded-lg" />
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
