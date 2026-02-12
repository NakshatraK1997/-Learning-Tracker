import { useNavigate, Link, useLocation } from "react-router-dom";
import { LogOut, User, LayoutDashboard, BookOpen, Settings } from "lucide-react";

export const Navbar = ({ user, logout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const isActive = (path) => {
        return location.pathname === path ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900";
    };

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                            <img src="/logo.png" alt="Company Logo" className="w-8 h-8 rounded-lg" />
                            <span className="text-xl font-bold text-gray-900 tracking-tight">LearningTracker</span>
                        </Link>

                        {user && (
                            <div className="hidden sm:ml-8 sm:flex sm:space-x-4 items-center">
                                {user.role === 'admin' ? (
                                    <Link
                                        to="/admin"
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/admin')}`}
                                    >
                                        Admin Dashboard
                                    </Link>
                                ) : (
                                    <Link
                                        to="/learner"
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/learner')}`}
                                    >
                                        My Learning
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-xs">
                                        {user.full_name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 hidden sm:block">
                                        {user.full_name}
                                    </span>
                                    <span className="text-xs text-gray-400 border-l border-gray-200 pl-2 ml-1 capitalize">
                                        {user.role}
                                    </span>
                                </div>

                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900">Log in</Link>
                                <Link to="/signup" className="btn btn-primary py-2 px-4 shadow-none">Sign up</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};
