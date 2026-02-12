import React, { Component, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { courseService, resourceService, reportService } from "../services/api";
import {
    Plus, Users, BookOpen, BarChart2, Bell, Search,
    MoreHorizontal, ArrowUpRight, ArrowDownRight, UserPlus, CheckCircle, Clock, FileText, Pencil, Save, X, Trash2, AlertTriangle, ChevronDown, ChevronUp, Download
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from "react-hot-toast";

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("AdminDashboard Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
                    <p className="text-gray-600 mb-4">{this.state.error?.toString()}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const AdminDashboardContent = () => {

    const [activeTab, setActiveTab] = useState("overview");
    const [courses, setCourses] = useState([]);
    const [users, setUsers] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]); // Dynamic state
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedCourse, setSelectedCourse] = useState("");
    const [userToDelete, setUserToDelete] = useState(null);
    const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }

    const showNotification = (type, message) => {
        setNotification({ type, message });
        if (type === 'success') {
            toast.success(message);
        } else {
            toast.error(message);
        }
        setTimeout(() => setNotification(null), 3000); // Clear banner after 3 seconds
    };

    // New course form state
    const [newCourse, setNewCourse] = useState({ title: "", description: "", video_url: "" });

    // --- Chart Data Logic ---
    const [timeRange, setTimeRange] = useState("daily");
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        if (!users) return;

        const processData = () => {
            const now = new Date();
            const dataMap = new Map();
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            // Helper to reset time for comparison
            const getStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

            let finalData = [];

            if (timeRange === "daily") {
                // Last 7 days
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - i);
                    const label = days[d.getDay()];
                    dataMap.set(getStartOfDay(d).getTime(), { name: label, users: 0, sortTime: d.getTime() });
                }

                users.forEach(u => {
                    if (!u.created_at) return;
                    const d = new Date(u.created_at);
                    const start = getStartOfDay(d).getTime();
                    if (dataMap.has(start)) {
                        dataMap.get(start).users += 1;
                    }
                });
                finalData = Array.from(dataMap.values());

            } else if (timeRange === "weekly") {
                // Last 4 weeks
                // Use simplified logic: grouping by ISO week or just 7-day chunks?
                // Let's use 4 distinct weeks ending today.
                for (let i = 3; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(d.getDate() - (i * 7));
                    const label = `Week ${4 - i}`; // Week 1, 2, 3, 4
                    // Key is strictly the bucket index for this simple view
                    // To map users, we check if they fall in the range
                    const endRange = new Date(now);
                    endRange.setDate(endRange.getDate() - (i * 7));
                    const startRange = new Date(endRange);
                    startRange.setDate(startRange.getDate() - 7);

                    dataMap.set(i, { name: label, users: 0, start: startRange, end: endRange });
                }
                finalData = Array.from(dataMap.values());

                users.forEach(u => {
                    if (!u.created_at) return;
                    const d = new Date(u.created_at);
                    // Find which bucket
                    finalData.forEach(bucket => {
                        if (d >= bucket.start && d <= bucket.end) {
                            bucket.users += 1;
                        }
                    });
                });

            } else if (timeRange === "monthly") {
                // Last 6 months
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now);
                    d.setMonth(d.getMonth() - i);
                    const label = months[d.getMonth()];
                    const key = `${d.getFullYear()}-${d.getMonth()}`;
                    dataMap.set(key, { name: label, users: 0 });
                }

                users.forEach(u => {
                    if (!u.created_at) return;
                    const d = new Date(u.created_at);
                    const key = `${d.getFullYear()}-${d.getMonth()}`;
                    if (dataMap.has(key)) {
                        dataMap.get(key).users += 1;
                    }
                });
                finalData = Array.from(dataMap.values());
            }

            setChartData(finalData);
        };

        processData();
    }, [users, timeRange]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [cData, uData, rActivity] = await Promise.all([
                courseService.getCourses(),
                courseService.getAllUsers(),
                reportService.getRecentActivity() // Fetch dynamic activity
            ]);
            setCourses(cData);
            setUsers(uData);
            setRecentActivity(rActivity);
        } catch (error) {
            console.error("Failed to load data", error);
            showNotification('error', "Failed to load dashboard data");
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await courseService.createCourse(newCourse);
            setNewCourse({ title: "", description: "", video_url: "" });
            loadData();
            showNotification('success', "Course created successfully!");
        } catch (error) {
            showNotification('error', "Failed to create course");
        }
    };

    const handleAssign = async () => {
        if (!selectedUser || !selectedCourse) return;
        try {
            await courseService.assignCourse(selectedUser, selectedCourse);
            showNotification('success', "Course assigned successfully");
            setSelectedUser("");
            setSelectedCourse("");
        } catch (error) {
            console.error("Assignment failed", error);
            const errorMessage = error.response?.data?.detail || "Assignment failed";
            showNotification('error', typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        }
    };

    const learnersCount = users ? users.filter(u => u.role === 'learner').length : 0;
    const coursesCount = courses.length;

    // --- Edit Course Logic ---
    const [editingCourse, setEditingCourse] = useState(null);

    const handleUpdateCourse = async () => {
        if (!editingCourse) return;
        try {
            await courseService.updateCourse(editingCourse.id, {
                title: editingCourse.title,
                description: editingCourse.description,
                video_url: editingCourse.video_url
            });
            showNotification('success', "Course updated successfully!");
            setEditingCourse(null);
            loadData();
        } catch (error) {
            console.error("Failed to update course", error);
            showNotification('error', "Failed to update course");
        }
    };

    // --- Edit User Logic ---
    const [editingUser, setEditingUser] = useState(null);

    const handleEditClick = (user) => {
        setEditingUser(user);
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            await courseService.updateUser(editingUser.id, {
                full_name: editingUser.full_name,
                role: editingUser.role
            });
            showNotification('success', "User updated successfully!");
            setEditingUser(null);
            loadData();
        } catch (error) {
            console.error(error);
            showNotification('error', "Failed to update user.");
        }
    };

    // --- Delete User Logic ---

    const handleDeleteClick = (user) => {
        if (user.role === 'admin') return; // Safety check
        setUserToDelete(user);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await courseService.deleteUser(userToDelete.id);
            setUsers(users.filter(u => u.id !== userToDelete.id)); // Optimistic or just correct
            setUserToDelete(null);
            showNotification('success', "User deleted successfully");
        } catch (error) {
            console.error("Delete failed", error);
            const msg = error.response?.data?.detail || "Failed to delete user";
            showNotification('error', msg);
        }
    };

    // --- Manage Resources Logic ---
    const [resourceModalOpen, setResourceModalOpen] = useState(false);
    const [currentCourseResources, setCurrentCourseResources] = useState(null);

    const handleManageResources = async (course) => {
        try {
            const resources = await resourceService.getResources(course.id);
            setCurrentCourseResources({ ...course, resources });
            setResourceModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch resources", error);
            showNotification('error', "Failed to load resources");
        }
    };

    const closeResourceModal = () => {
        setResourceModalOpen(false);
        setCurrentCourseResources(null);
    };

    const refreshResources = async () => {
        if (currentCourseResources) {
            await handleManageResources(currentCourseResources);
        }
    };

    const handleDeleteResource = async (resourceId) => {
        if (!window.confirm("Are you sure you want to delete this resource?")) return;
        try {
            await resourceService.deleteResource(resourceId);
            refreshResources();
            showNotification('success', "Resource deleted");
        } catch (error) {
            console.error("Failed to delete resource", error);
            showNotification('error', "Failed to delete resource");
        }
    };

    const handleDeleteCourse = async (course) => {
        if (!window.confirm(`Are you sure you want to delete the course "${course.title}"? This cannot be undone.`)) return;
        try {
            await courseService.deleteCourse(course.id);
            setCourses(courses.filter(c => c.id !== course.id));
            showNotification('success', "Course deleted successfully");
        } catch (error) {
            console.error("Failed to delete course", error);
            showNotification('error', "Failed to delete course");
        }
    };

    // Render Tab Content
    const renderOverview = () => (
        <>
            {/* IN-PAGE FEEDBACK BANNER */}
            {notification && (
                <div className={`mb-4 p-4 rounded-md flex items-center ${notification.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                    {notification.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 mr-2" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 mr-2" />
                    )}
                    {notification.message}
                </div>
            )}
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Learners</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{learnersCount}</h3>
                        </div>
                        <span className="flex items-center text-green-500 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> +5.2%
                        </span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completion Rate</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">78%</h3>
                        </div>
                        <span className="flex items-center text-green-500 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> +2.1%
                        </span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Courses</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{coursesCount}</h3>
                        </div>
                        <span className="flex items-center text-green-500 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> +12.4%
                        </span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Sign-ups</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{recentActivity ? recentActivity.length : 0}</h3>
                        </div>
                        <span className="flex items-center text-green-500 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> +8.5%
                        </span>
                    </div>
                </div>
            </div>



            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Recent Student Activity (New Signups)</h3>
                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All</button>
                </div>
                <ul className="divide-y divide-gray-100">
                    {recentActivity && recentActivity.length > 0 ? recentActivity.map((user, i) => (
                        <li key={i} className="p-4 hover:bg-gray-50 transition-colors flex items-center">
                            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 mr-4 font-bold">
                                {user.full_name?.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                <p className="text-xs text-gray-500">New Learner Signup</p>
                            </div>
                            <span className="text-xs text-gray-400">
                                {new Date(user.created_at || Date.now()).toLocaleDateString()}
                            </span>
                        </li>
                    )) : (
                        <li className="p-4 text-gray-500 text-sm italic">No recent activity found.</li>
                    )}
                </ul>
            </div>
        </>
    );

    const renderManageCourses = () => (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Course */}
                <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
                    <div className="flex items-center mb-6">
                        <BookOpen className="h-6 w-6 text-indigo-600 mr-2" />
                        <h2 className="text-lg font-bold text-gray-900">Create New Course</h2>
                    </div>
                    <form onSubmit={handleCreateCourse} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                required
                                value={newCourse.title}
                                onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border"
                                placeholder="e.g. Advanced Python"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (Embed)</label>
                            <input
                                type="text"
                                required
                                placeholder="https://www.youtube.com/embed/..."
                                value={newCourse.video_url}
                                onChange={e => setNewCourse({ ...newCourse, video_url: e.target.value })}
                                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={newCourse.description}
                                onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border"
                                rows={4}
                                placeholder="Course description..."
                            />
                        </div>
                        <button type="submit" className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                            <Plus className="w-4 h-4 mr-2" /> Create Course
                        </button>
                    </form>
                </div>

                {/* Assign Course */}
                <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
                    <div className="flex items-center mb-6">
                        <Users className="h-6 w-6 text-indigo-600 mr-2" />
                        <h2 className="text-lg font-bold text-gray-900">Assign Course</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Learner</label>
                            <select
                                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border"
                                value={selectedUser}
                                onChange={e => setSelectedUser(e.target.value)}
                            >
                                <option value="">Choose a user...</option>
                                {users.filter(u => u.role === 'learner').map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
                            <select
                                className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border"
                                value={selectedCourse}
                                onChange={e => setSelectedCourse(e.target.value)}
                            >
                                <option value="">Choose a course...</option>
                                {courses && courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleAssign}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors mt-6"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" /> Assign Course
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Courses List */}
            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Existing Courses</h2>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Video URL</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {courses && courses.map((course) => (
                            <tr key={course.id} className="hover:bg-gray-50">
                                {editingCourse && editingCourse.id === course.id ? (
                                    <>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={editingCourse.title}
                                                onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })}
                                                className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-1 border"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={editingCourse.description || ""}
                                                onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })}
                                                className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-1 border"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={editingCourse.video_url}
                                                onChange={e => setEditingCourse({ ...editingCourse, video_url: e.target.value })}
                                                className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm p-1 border"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={handleUpdateCourse} className="text-green-600 hover:text-green-900">
                                                    <Save className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => setEditingCourse(null)} className="text-red-600 hover:text-red-900">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">{course.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">{course.video_url}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-3">
                                                <button
                                                    onClick={() => handleManageResources(course)}
                                                    className="text-blue-600 hover:text-blue-900 flex items-center"
                                                    title="Manage Resources"
                                                >
                                                    <FileText className="w-4 h-4 mr-1" /> Resources
                                                </button>
                                                <button
                                                    onClick={() => setEditingCourse(course)}
                                                    className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                                    title="Edit Course"
                                                >
                                                    <Pencil className="w-4 h-4 mr-1" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCourse(course)}
                                                    className="text-red-600 hover:text-red-900 flex items-center"
                                                    title="Delete Course"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Manage Resources Modal */}
            {resourceModalOpen && currentCourseResources && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">
                                Manage Resources: {currentCourseResources.title}
                            </h3>
                            <button onClick={closeResourceModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Existing Resources</h4>
                            {currentCourseResources.resources && currentCourseResources.resources.length > 0 ? (
                                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                                    {currentCourseResources.resources.map(res => (
                                        <li key={res.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                            <div className="flex items-center">
                                                <FileText className="w-5 h-5 text-gray-400 mr-3" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{res.file_name}</p>
                                                    <p className="text-xs text-gray-500">{res.file_size}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteResource(res.id)}
                                                className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                                                title="Delete Resource"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No resources uploaded yet.</p>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Add New Resource</h4>
                            <ResourceUploadForm
                                courses={[currentCourseResources]}
                                onSuccess={refreshResources}
                                preSelectedCourse={currentCourseResources.id}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Resource Upload Section */}
            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
                <div className="flex items-center mb-6">
                    <FileText className="h-6 w-6 text-indigo-600 mr-2" />
                    <h2 className="text-lg font-bold text-gray-900">Upload Course Resources</h2>
                </div>
                <ResourceUploadForm courses={courses} />
            </div>
        </div>
    );

    const ResourceUploadForm = ({ courses, onSuccess, preSelectedCourse }) => {
        const [resource, setResource] = useState({
            course_id: preSelectedCourse || "",
            file_name: "",
            file_size: "",
            file_url: ""
        });

        const handleUpload = async (e) => {
            e.preventDefault();
            if (!resource.course_id) {
                showNotification('error', "Select a course");
                return;
            }
            try {
                await resourceService.addResource(resource.course_id, resource);
                showNotification('success', "Resource added!");
                setResource({ course_id: preSelectedCourse || "", file_name: "", file_size: "", file_url: "" });
                if (onSuccess) onSuccess();
            } catch (error) {
                console.error(error);
                showNotification('error', "Failed to add resource");
            }
        };

        return (
            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
                    <select
                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border"
                        value={resource.course_id}
                        onChange={e => setResource({ ...resource, course_id: e.target.value })}
                        required
                        disabled={!!preSelectedCourse}
                    >
                        <option value="">Choose a course...</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
                    <input
                        type="text"
                        placeholder="e.g. Course Syllabus.pdf"
                        value={resource.file_name}
                        onChange={e => setResource({ ...resource, file_name: e.target.value })}
                        className="block w-full border-gray-300 rounded-lg shadow-sm sm:text-sm p-2.5 border"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">File Size</label>
                    <input
                        type="text"
                        placeholder="e.g. 2.5 MB"
                        value={resource.file_size}
                        onChange={e => setResource({ ...resource, file_size: e.target.value })}
                        className="block w-full border-gray-300 rounded-lg shadow-sm sm:text-sm p-2.5 border"
                        required
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">File URL / Path</label>
                    <input
                        type="text"
                        placeholder="/uploads/syllabus.pdf or https://..."
                        value={resource.file_url}
                        onChange={e => setResource({ ...resource, file_url: e.target.value })}
                        className="block w-full border-gray-300 rounded-lg shadow-sm sm:text-sm p-2.5 border"
                        required
                    />
                </div>
                <div className="md:col-span-2">
                    <button type="submit" className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" /> Add Resource
                    </button>
                </div>
            </form>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Header / Top Nav */}
            <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center space-x-8">
                    <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                    <nav className="hidden md:flex space-x-1">
                        {['overview', 'courses', 'users', 'reports'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-2 rounded-md text-sm font-medium capitalize transition-colors ${activeTab === tab
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative hidden md:block">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64" />
                    </div>
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                    <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                        A
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <DeleteConfirmationModal
                    userToDelete={userToDelete}
                    setUserToDelete={setUserToDelete}
                    confirmDelete={confirmDelete}
                />
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'courses' && renderManageCourses()}
                {activeTab === 'users' && (
                    <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">Edit</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users && users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        {editingUser && editingUser.id === user.id ? (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                                            {user.full_name?.charAt(0)}
                                                        </div>
                                                        <div className="ml-4">
                                                            <input
                                                                type="text"
                                                                value={editingUser.full_name}
                                                                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-1 border"
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <select
                                                        value={editingUser.role}
                                                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-1 border"
                                                    >
                                                        <option value="learner">learner</option>
                                                        <option value="admin">admin</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    Active
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-2">
                                                        <button onClick={handleUpdateUser} className="text-green-600 hover:text-green-900" title="Save">
                                                            <Save className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-900" title="Cancel">
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                                            {user.full_name?.charAt(0)}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    Active
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end space-x-3">
                                                        <button onClick={() => handleEditClick(user)} className="text-indigo-600 hover:text-indigo-900 flex items-center">
                                                            <Pencil className="w-4 h-4 mr-1" /> Edit
                                                        </button>
                                                        {user.role !== 'admin' ? (
                                                            <button
                                                                onClick={() => handleDeleteClick(user)}
                                                                className="text-red-600 hover:text-red-900 flex items-center"
                                                                title="Delete User"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-300 flex items-center cursor-not-allowed" title="Cannot delete admins">
                                                                <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {activeTab === 'reports' && <ReportsView />}
            </div>
        </div>
    );
};

export const AdminDashboard = () => (
    <ErrorBoundary>
        <AdminDashboardContent />
    </ErrorBoundary>
);

function DeleteConfirmationModal({ userToDelete, setUserToDelete, confirmDelete }) {
    if (!userToDelete) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-center text-gray-900 mb-2">Delete User</h3>
                <p className="text-sm text-center text-gray-500 mb-6">
                    Are you sure you want to delete <span className="font-bold">{userToDelete.full_name}</span>?
                    This action cannot be undone.
                </p>
                <div className="flex justify-center space-x-3">
                    <button
                        onClick={() => setUserToDelete(null)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmDelete}
                        className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-white hover:bg-red-700 font-medium text-sm"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}


function ReportsView() {
    const [reports, setReports] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [detailedReports, setDetailedReports] = useState({}); // { userId: reportData }

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const data = await reportService.getAdminReports();
                setReports(data || []);
            } catch (error) {
                console.error("Failed to load reports", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const toggleExpand = async (userId) => {
        if (expandedUserId === userId) {
            setExpandedUserId(null);
            return;
        }

        setExpandedUserId(userId);

        // Fetch detail if not cached
        if (!detailedReports[userId]) {
            try {
                const detail = await reportService.getLearnerReport(userId);
                setDetailedReports(prev => ({ ...prev, [userId]: detail }));
            } catch (error) {
                console.error("Failed to load detailed report", error);
                // Assuming 'toast' is available, if not, this line might need adjustment or removal.
                // For now, I'll include it as it's in the provided snippet.
                // toast.error("Failed to load details");
            }
        }
    };

    const handlePrint = (userId) => {
        const report = detailedReports[userId];
        if (!report) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Please allow popups to print the report.");
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Progress Report - ${report.full_name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
                    .header { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                    .header h1 { margin: 0 0 10px 0; color: #4F46E5; font-size: 24px; }
                    .header p { margin: 5px 0; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
                    th { background-color: #f9fafb; font-weight: 600; color: #374151; font-size: 0.9em; text-transform: uppercase; letter-spacing: 0.05em; }
                    tr:nth-child(even) { background-color: #f9fafb; }
                    .status-tag { padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 500; }
                    .status-started { background-color: #dbeafe; color: #1e40af; }
                    .status-not-started { background-color: #f3f4f6; color: #4b5563; }
                    .status-completed { color: #059669; font-weight: bold; }
                    .status-locked { color: #9ca3af; font-style: italic; }
                    .score-pass { color: #059669; font-weight: bold; }
                    .score-fail { color: #dc2626; font-weight: bold; }
                    .footer { margin-top: 40px; font-size: 0.8em; text-align: center; color: #9ca3af; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Learner Progress Report</h1>
                    <p><strong>Learner:</strong> ${report.full_name}</p>
                    <p><strong>Email:</strong> ${report.email}</p>
                    <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Course Title</th>
                            <th>Video Status</th>
                            <th>Quiz Score</th>
                            <th>Certificate Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.courses.map(course => `
                            <tr>
                                <td>${course.course_title}</td>
                                <td>
                                    <span class="status-tag ${course.video_status === 'Started' ? 'status-started' : 'status-not-started'}">
                                        ${course.video_status}
                                    </span>
                                </td>
                                <td>
                                    ${course.quiz_score !== null
                ? `<span class="${course.quiz_score >= 70 ? 'score-pass' : 'score-fail'}">${course.quiz_score}%</span>`
                : '<span style="color:#9ca3af">Not Taken</span>'}
                                </td>
                                <td>
                                    ${course.is_completed
                ? '<span class="status-completed">✓ Earned</span>'
                : '<span class="status-locked">Locked</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <p>Generated by LearningTracker System</p>
                </div>
                <script>
                    window.onload = function() { setTimeout(function() { window.print(); }, 500); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const filteredReports = reports.filter(r =>
        r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Loading reports...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Learner Progress Reports</h2>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 w-64"
                    />
                </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Learner</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredReports.map((report) => (
                            <React.Fragment key={report.user_id}>
                                <tr className={`hover:bg-gray-50 cursor-pointer ${expandedUserId === report.user_id ? 'bg-indigo-50' : ''}`} onClick={() => toggleExpand(report.user_id)}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {report.full_name.charAt(0)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{report.full_name}</div>
                                                <div className="text-xs text-gray-500">{report.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {report.courses_enrolled}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {report.courses_completed}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="w-full max-w-xs">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span>{report.completion_percentage}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${report.completion_percentage >= 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${report.completion_percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-gray-400 hover:text-indigo-600">
                                            {expandedUserId === report.user_id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </td>
                                </tr>
                                {/* Expanded Details Row */}
                                {expandedUserId === report.user_id && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 bg-gray-50 border-t border-gray-100 shadow-inner">
                                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Detailed Progress Report</h4>
                                                    <button onClick={() => handlePrint(report.user_id)} className="flex items-center text-xs font-bold text-gray-600 hover:text-indigo-600 border border-gray-300 rounded px-2 py-1 hover:border-indigo-600 transition-colors">
                                                        <Download className="w-3 h-3 mr-1" /> Download PDF
                                                    </button>
                                                </div>

                                                {!detailedReports[report.user_id] ? (
                                                    <div className="text-center py-4 text-gray-500">Loading details...</div>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-sm">
                                                            <thead>
                                                                <tr className="bg-gray-100 text-gray-600 text-left">
                                                                    <th className="p-2 rounded-l-md">Course Title</th>
                                                                    <th className="p-2">Video Status</th>
                                                                    <th className="p-2">Quiz Score</th>
                                                                    <th className="p-2 rounded-r-md text-right">Certificate</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {detailedReports[report.user_id].courses.length === 0 ? (
                                                                    <tr><td colSpan="4" className="p-4 text-center text-gray-500 italic">No courses assigned.</td></tr>
                                                                ) : (
                                                                    detailedReports[report.user_id].courses.map(course => (
                                                                        <tr key={course.course_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                                            <td className="p-2 font-medium text-gray-900">{course.course_title}</td>
                                                                            <td className="p-2">
                                                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${course.video_status === 'Started' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                                    {course.video_status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="p-2">
                                                                                {course.quiz_score !== null ? (
                                                                                    <span className={`font-bold ${course.quiz_score >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                                                                                        {course.quiz_score}%
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-gray-400 text-xs">Not Taken</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="p-2 text-right">
                                                                                {course.is_completed ? (
                                                                                    <span className="text-green-600 flex items-center justify-end gap-1 font-bold text-xs">
                                                                                        <CheckCircle className="w-3 h-3" /> Earned
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-gray-400 text-xs">Locked</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {filteredReports.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-sm">
                                    No reports found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
