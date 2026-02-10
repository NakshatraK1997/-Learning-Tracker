import axios from "axios";

const API_URL = "http://localhost:8000";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptor to add User Email for backend identification
api.interceptors.request.use(
    (config) => {
        const userStr = localStorage.getItem("user");
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user && user.email) {
                    config.headers["X-User-Email"] = user.email;
                }
            } catch (e) {
                // Ignore parse error
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Simple interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (email, password) => {
        const response = await api.post("/api/login", { email, password });
        if (response.data) {
            localStorage.setItem("user", JSON.stringify(response.data));
        }
        return response.data;
    },
    signup: async (userData) => {
        const response = await api.post("/signup", userData);
        return response.data;
    },
    getCurrentUser: async () => {
        const userStr = localStorage.getItem("user");
        if (userStr) return JSON.parse(userStr);
        return null;
    },
    logout: () => {
        localStorage.removeItem("user");
    },
};

export const courseService = {
    // Admin only
    createCourse: async (courseData) => {
        const response = await api.post("/courses/", courseData);
        return response.data;
    },
    getAllUsers: async () => {
        const response = await api.get("/users/");
        return response.data;
    },
    updateUser: async (userId, userData) => {
        const response = await api.put(`/users/${userId}`, userData);
        return response.data;
    },
    assignCourse: async (userId, courseId) => {
        const response = await api.post("/assignments/", { user_id: userId, course_id: courseId });
        return response.data;
    },
    // Learner + Admin
    getCourses: async () => {
        const response = await api.get("/courses/");
        // Backend handles if it returns all (admin) or assigned (learner) based on token role
        return response.data;
    },
    getLearnerCourses: async () => {
        const response = await api.get("/my-courses/");
        return response.data;
    }
};

export const progressService = {
    getProgress: async (courseId) => {
        const response = await api.get(`/progress/${courseId}`);
        return response.data;
    },
    updateProgress: async (courseId, data) => { // data = { is_completed: bool, notes: str }
        const response = await api.put(`/progress/${courseId}`, data);
        return response.data;
    }
};

export const quizService = {
    submitQuiz: async (quizId, answers) => {
        const response = await api.post("/quizzes/submit", { quiz_id: quizId, answers });
        return response.data;
    }
};

export const resourceService = {
    addResource: async (courseId, resourceData) => {
        const response = await api.post(`/courses/${courseId}/resources`, resourceData);
        return response.data;
    },
    getResources: async (courseId) => {
        const response = await api.get(`/courses/${courseId}/resources`);
        return response.data;
    }
};

export const reportService = {
    getAdminReports: async () => {
        const response = await api.get("/admin/reports");
        return response.data;
    },
    getRecentActivity: async () => {
        const response = await api.get("/admin/recent-activity");
        return response.data;
    }
};

export default api;
