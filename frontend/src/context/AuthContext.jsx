import { createContext, useState, useEffect, useContext } from "react";
import { authService } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                try {
                    setUser(JSON.parse(userStr));
                } catch (error) {
                    console.error("Auth init failed:", error);
                    localStorage.removeItem("user");
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const data = await authService.login(email, password);
            const userData = await authService.getCurrentUser();
            setUser(userData);
            return true;
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const signup = async (data) => {
        try {
            await authService.signup(data);
            return true;
        } catch (error) {
            console.error("Signup failed:", error);
            throw error;
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, signup, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
