import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { courseService, resourceService, reportService } from "../services/api";
import {
    Plus, Users, BookOpen, BarChart2, Bell, Search,
    MoreHorizontal, ArrowUpRight, ArrowDownRight, UserPlus, CheckCircle, Clock, FileText, Pencil, Save, X
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [courses, setCourses] = useState([]);
    const [users, setUsers] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]); // Dynamic state
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedCourse, setSelectedCourse] = useState("");

    // New course form state
    const [newCourse, setNewCourse] = useState({ title: "", description: "", video_url: "" });

    // Mock Chart Data
    const data = [
        { name: 'Mon', users: 400 },
        { name: 'Tue', users: 300 },
        { name: 'Wed', users: 550 },
        { name: 'Thu', users: 450 },
        { name: 'Fri', users: 680 },
        { name: 'Sat', users: 200 },
        { name: 'Sun', users: 800 },
    ];

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
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await courseService.createCourse(newCourse);
            setNewCourse({ title: "", description: "", video_url: "" });
            loadData();
            alert("Course created!");
        } catch (error) {
            alert("Failed to create course");
        }
    };

    const handleAssign = async () => {
        if (!selectedUser || !selectedCourse) return;
        try {
            await courseService.assignCourse(selectedUser, selectedCourse);
            alert("Course assigned successfully");
            setSelectedUser("");
            setSelectedCourse("");
        } catch (error) {
            console.error("Assignment failed", error);
            const errorMessage = error.response?.data?.detail || "Assignment failed";
            alert(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        }
    };

    const learnersCount = users.filter(u => u.role === 'learner').length;
    const coursesCount = courses.length;

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
            alert("User updated successfully!");
            setEditingUser(null);
            loadData();
        } catch (error) {
            console.error(error);
            alert("Failed to update user.");
        }
    };

    // Render Tab Content
    const renderOverview = () => (
        <>
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
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{recentActivity.length}</h3>
                        </div>
                        <span className="flex items-center text-green-500 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> +8.5%
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">User Growth Over Time</h3>
                        <div className="flex items-center mt-1">
                            <span className="text-2xl font-bold text-gray-900">2,450</span>
                            <span className="ml-2 flex items-center text-green-500 text-sm font-medium">
                                <ArrowUpRight className="w-4 h-4 mr-1" /> 15%
                            </span>
                        </div>
                    </div>
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                        <button className="px-3 py-1 text-xs font-medium bg-white shadow-sm rounded-md text-gray-900">Daily</button>
                        <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-900">Weekly</button>
                        <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-900">Monthly</button>
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <CartesianGrid vertical={false} stroke="#f3f4f6" />
                            <Area type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Recent Student Activity (New Signups)</h3>
                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All</button>
                </div>
                <ul className="divide-y divide-gray-100">
                    {recentActivity.length > 0 ? recentActivity.map((user, i) => (
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                            {courses.map(c => (
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

            {/* Resource Upload Section */}
            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100 lg:col-span-2">
                <div className="flex items-center mb-6">
                    <FileText className="h-6 w-6 text-indigo-600 mr-2" />
                    <h2 className="text-lg font-bold text-gray-900">Upload Course Resources</h2>
                </div>
                <ResourceUploadForm courses={courses} />
            </div>
        </div>
    );

    const ResourceUploadForm = ({ courses }) => {
        const [resource, setResource] = useState({ course_id: "", file_name: "", file_size: "", file_url: "" });

        const handleUpload = async (e) => {
            e.preventDefault();
            if (!resource.course_id) {
                alert("Select a course");
                return;
            }
            try {
                await resourceService.addResource(resource.course_id, resource);
                alert("Resource added!");
                setResource({ course_id: "", file_name: "", file_size: "", file_url: "" });
            } catch (error) {
                console.error(error);
                alert("Failed to add resource");
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
                                {users.map((user) => (
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
                                                    <button onClick={() => handleEditClick(user)} className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end w-full">
                                                        <Pencil className="w-4 h-4 mr-1" /> Edit
                                                    </button>
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

    function ReportsView() {
        const [reports, setReports] = useState([]);
        const [searchTerm, setSearchTerm] = useState("");
        const [loading, setLoading] = useState(true);

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
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredReports.map((report) => (
                                <tr key={report.user_id} className="hover:bg-gray-50">
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
                                </tr>
                            ))}
                            {filteredReports.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500 text-sm">
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
};
