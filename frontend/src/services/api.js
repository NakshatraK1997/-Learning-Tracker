import axios from "axios";

const API_URL = "http://localhost:8000/api";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});


// Interceptor to add Bearer Token for backend authentication
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token && token.trim() !== "" && token !== "undefined" && token !== "null") {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        console.log(`Making request to ${config.url} with token present: ${!!token}`);
        return config;
    },
    (error) => {
        console.error("Request error:", error);
        return Promise.reject(error);
    }
);

// Simple interceptor to handle errors
api.interceptors.response.use(
    (response) => {
        console.log(`Response from ${response.config.url}:`, response.status);
        return response;
    },
    (error) => {
        console.error("API Error:", error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 401) {
            console.warn("Unauthorized! Redirecting to login...");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (email, password) => {
        const response = await api.post("/login", { email, password });
        if (response.data && response.data.access_token) {
            localStorage.setItem("token", response.data.access_token);
            localStorage.setItem("user", JSON.stringify(response.data.user)); // Store user object separately
            return response.data.user; // Return user object to keep context consistent
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
        localStorage.removeItem("token");
    },
};

export const courseService = {
    // Admin only
    createCourse: async (courseData) => {
        const response = await api.post("/courses/", courseData);
        return response.data;
    },
    updateCourse: async (courseId, courseData) => {
        const response = await api.put(`/courses/${courseId}`, courseData);
        return response.data;
    },
    deleteCourse: async (courseId) => {
        const response = await api.delete(`/courses/${courseId}`);
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
    deleteUser: async (userId) => {
        const response = await api.delete(`/users/${userId}`);
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
    },
    getCourse: async (courseId) => {
        const response = await api.get(`/courses/${courseId}`);
        return response.data;
    },
    getCourseQuizzes: async (courseId) => {
        const response = await api.get(`/courses/${courseId}/quiz`);
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
    },
    getQuizHistory: async () => {
        const response = await api.get("/quizzes/history");
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
    },
    deleteResource: async (resourceId) => {
        const response = await api.delete(`/resources/${resourceId}`);
        return response.data;
    }
};

export const reportService = {
    getAdminReports: async () => {
        const response = await api.get("/admin/reports");
        return response.data;
    },
    getLearnerReport: async (userId) => {
        const response = await api.get(`/admin/reports/${userId}`);
        return response.data;
    },
    getRecentActivity: async () => {
        const response = await api.get("/admin/recent-activity");
        return response.data;
    }
};

export const userService = {
    getUserStats: async () => {
        const response = await api.get("/user/stats");
        return response.data;
    },
    getUserProgress: async () => {
        const response = await api.get("/user/progress");
        return response.data;
    }
};

export default api;
