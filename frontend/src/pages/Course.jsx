import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { progressService, courseService, quizService, resourceService } from "../services/api";
import {
    Save, CheckCircle, ArrowLeft, Download, FileText,
    Video as VideoIcon, BookOpen, ChevronRight, Home, XCircle, User, Calendar
} from "lucide-react";
import React, { Suspense } from "react";

// Lazy load VideoPlayer to prevent app-wide crash if import fails
const VideoPlayer = React.lazy(() => import("../components/video/VideoPlayer"));

export const Course = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [notes, setNotes] = useState("");
    const [isCompleted, setIsCompleted] = useState(false);
    const [playbackPosition, setPlaybackPosition] = useState(0.0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [resources, setResources] = useState([]);

    // Quiz State
    const [quizAnswers, setQuizAnswers] = useState({}); // { questionIndex: optionIndex }
    const [quizResult, setQuizResult] = useState(null);
    const [quizSubmitting, setQuizSubmitting] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // URL Cleaner Helper
    const ensureHttps = (url) => {
        if (!url) return "";
        const trimmed = url.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
        return `https://${trimmed}`;
    };

    // Fetch details
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch specific course details directly
                const foundCourse = await courseService.getCourse(id);

                if (!foundCourse) {
                    console.warn("Course not found. Redirecting...");
                    navigate('/learner');
                    return;
                }

                console.log("Admin Link Received:", foundCourse.video_url);
                // Sanitize video URL before setting course
                foundCourse.video_url = ensureHttps(foundCourse.video_url);
                setCourse(foundCourse);

                try {
                    const prog = await progressService.getProgress(id);
                    if (prog) {
                        setNotes(prog.notes || "");
                        setIsCompleted(prog.is_completed);
                        setPlaybackPosition(prog.playback_position || 0.0);
                    }
                } catch (progError) {
                    // Ignore 404 on progress (just means not started yet)
                    console.log("Progress not found, starting fresh.", progError);
                }

                try {
                    const res = await resourceService.getResources(id);
                    setResources(res || []);
                } catch (resError) {
                    console.warn("Failed to load resources", resError);
                    setResources([]);
                }

                setInitialLoad(false);

            } catch (error) {
                console.error("Failed to load course details", error);
                navigate('/learner');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id, navigate]);

    useEffect(() => {
        if (course) {
            console.log("Current Video URL:", course.video_url);
        }
    }, [course]);

    // Auto-save Notes Effect
    useEffect(() => {
        if (!initialLoad && course) {
            const timer = setTimeout(() => {
                handleSaveEvents(); // Save 1.5s after last modification
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [notes]); // Do NOT include handleSaveEvents in deps to avoid loops

    // Auto-save Playback Position (Debounced)
    useEffect(() => {
        if (!initialLoad && course && playbackPosition > 0) {
            const timer = setTimeout(() => {
                handleSaveEvents();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [playbackPosition]);

    const handleSaveEvents = async (currentProgress = null) => {
        // Prevent saving before initial load
        if (initialLoad || !course) return;

        setSaving(true);
        try {
            await progressService.updateProgress(id, {
                is_completed: isCompleted,
                notes: notes,
                playback_position: currentProgress !== null ? currentProgress : playbackPosition
            });
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setSaving(false);
        }
    };

    const handleVideoProgress = (state) => {
        setPlaybackPosition(state.played);
    };

    const handleVideoComplete = () => {
        // Updated Logic: Video completion does nothing.
        // Course completion is strictly triggered by passing the quiz.
        console.log("Video finished. Completion requires passing the quiz.");
    };

    const handleQuizOptionChange = (questionIndex, optionIndex) => {
        setQuizAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
    };

    const submitQuiz = async (quizId) => {
        if (!course) return;
        setQuizSubmitting(true);
        try {
            const quiz = course.quizzes.find(q => q.id === quizId);
            if (!quiz) return;

            const answersList = quiz.questions.map((_, idx) => quizAnswers[idx] ?? -1);

            const result = await quizService.submitQuiz(quizId, answersList);
            setQuizResult(result);

            // Auto complete course ONLY on passing quiz
            if (result.score >= 70 && !isCompleted) {
                setIsCompleted(true);
                handleSaveEvents(); // Save the completed status
                // Force update progress to 100% locally just in case
                await progressService.updateProgress(id, {
                    is_completed: true,
                    notes: notes,
                    playback_position: playbackPosition
                });
            }

        } catch (error) {
            console.error("Quiz submission failed", error);
            alert("Failed to submit quiz. Please try again.");
        } finally {
            setQuizSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!course) return (
        <div className="max-w-7xl mx-auto py-12 px-4 text-center">
            <h2 className="text-xl font-bold text-gray-900">Course not found.</h2>
            <Link to="/learner" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block font-medium">Return to Dashboard</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Link to="/learner" className="flex items-center hover:text-indigo-600 transition-colors">
                            <Home className="w-4 h-4 mr-1" /> Dashboard
                        </Link>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 truncate max-w-[200px]">{course.title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{course.title}</h1>
                        <Link to="/learner" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-3 lg:gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* 1. Video Player Section */}
                        <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video relative group">
                            {loading ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                                    <p className="text-gray-400 font-medium">Loading Video...</p>
                                </div>
                            ) : course && course.video_url ? (
                                <Suspense fallback={
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                                        <p className="text-gray-400 font-medium">Loading Player...</p>
                                    </div>
                                }>
                                    <VideoPlayer
                                        url={ensureHttps(course.video_url)}
                                        onProgress={handleVideoProgress}
                                        initialProgress={playbackPosition}
                                    />
                                </Suspense>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                                    <div className="text-center">
                                        <VideoIcon className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                                        <h3 className="text-xl font-bold">Video content not found</h3>
                                        <p className="text-gray-400 mt-2">Please contact your administrator.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Course Info */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">About this Course</h2>
                            </div>
                            <p className="text-gray-600 leading-relaxed text-lg">
                                {course.description || "No description provided."}
                            </p>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                                <span className="flex items-center gap-2">
                                    <User className="w-4 h-4" /> Instructor: Admin Team
                                </span>
                                <span className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Last Updated: {new Date().toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* 3. Downloadable Resources */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                    <Download className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Course Resources</h2>
                            </div>
                            {resources.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {resources.map((file, i) => (
                                        <div key={i} className="flex items-center p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                                            <div className="bg-red-50 text-red-500 p-3 rounded-lg mr-4 group-hover:bg-red-100 transition-colors">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-gray-900 truncate" title={file.file_name}>{file.file_name}</h4>
                                                <p className="text-xs text-gray-500">{file.file_size}</p>
                                            </div>
                                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="ml-2">
                                                <Download className="w-5 h-5 text-gray-400 hover:text-indigo-600 transition-colors" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 italic">
                                    No resources available for this course.
                                </div>
                            )}
                        </div>

                        {/* 4. Quiz Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8" id="quiz-section">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Knowledge Check</h2>
                                {playbackPosition === 0 && !isCompleted && (
                                    <div className="ml-auto bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                        <div className="w-3 h-3 rounded-full border-2 border-gray-400"></div>
                                        Locked
                                    </div>
                                )}
                            </div>

                            {/* Locked Overlay Logic */}
                            <div className="relative">
                                {playbackPosition === 0 && !isCompleted && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-xl border border-gray-100">
                                        <div className="p-4 bg-white rounded-full shadow-lg mb-3">
                                            <div className="w-6 h-6 border-2 border-gray-300 rounded-t-lg border-b-0 mx-auto mb-[-2px]"></div>
                                            <div className="w-8 h-6 bg-gray-300 rounded-md"></div>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800">Quiz Locked</h3>
                                        <p className="text-gray-500 text-sm">Start watching the video to unlock.</p>
                                    </div>
                                )}

                                {course.quizzes && course.quizzes.length > 0 ? (
                                    <div className="space-y-8">
                                        {course.quizzes.map(quiz => {
                                            // Stepper State Logic (Local to each quiz mapping is tricky, but assuming 1 quiz mostly. 
                                            // For robustness, we'll use a component if multiple queries.
                                            // But here, we'll implement a simple stepper for the first active quiz or index based.
                                            // To keep it clean, let's just render the questions of the quiz with local state if we extract component.
                                            // Since we can't extract easily here, we'll add state at the top level for currentQuestionIndex.

                                            // IMPORTANT: We need to handle 'currentQuestionIndex' state which I will add to the component state next.
                                            const questions = quiz.questions || [];
                                            const totalQ = questions.length;
                                            const currentQ = questions[currentQuestionIndex || 0];

                                            if (totalQ === 0) return (
                                                <div key={quiz.id} className="text-gray-500 text-center py-4">No questions available.</div>
                                            );

                                            return (
                                                <div key={quiz.id} className="border-t border-gray-100 pt-6 first:border-0 first:pt-0">
                                                    <h3 className="font-bold text-gray-800 mb-6 text-xl">{quiz.title}</h3>

                                                    {quizResult ? (
                                                        <div className={`p-8 rounded-2xl border-2 text-center animation-fade-in ${quizResult.score >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${quizResult.score >= 70 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                                {quizResult.score >= 70 ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                                                            </div>
                                                            <span className="text-5xl font-black block mb-2 text-gray-900">{quizResult.score}%</span>
                                                            <h4 className="text-xl font-bold text-gray-900 mb-1">
                                                                {quizResult.score >= 70 ? "Congratulations! You Passed." : "Keep Trying!"}
                                                            </h4>
                                                            <p className="text-gray-600">
                                                                {quizResult.score >= 70 ? "You have successfully demonstrated your understanding." : "Review the material and take the quiz again."}
                                                            </p>
                                                            <button onClick={() => { setQuizResult(null); setCurrentQuestionIndex(0); setQuizAnswers({}); }} className="mt-6 text-sm font-semibold text-gray-600 hover:text-gray-900 underline">
                                                                Retake Quiz
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-8">
                                                            {/* Stepper Header */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-sm font-medium text-gray-500">Question {currentQuestionIndex + 1} of {totalQ}</span>
                                                                <div className="flex gap-1">
                                                                    {Array.from({ length: Math.min(totalQ, 10) }).map((_, i) => ( // Show distinct dots for up to 10, or just simple bar
                                                                        <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i <= (currentQuestionIndex % 10) ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="w-full bg-gray-100 h-2 rounded-full mb-6">
                                                                <div
                                                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                                                    style={{ width: `${((currentQuestionIndex + 1) / totalQ) * 100}%` }}
                                                                ></div>
                                                            </div>

                                                            {/* Active Question */}
                                                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 min-h-[300px] flex flex-col justify-center">
                                                                <div className="flex gap-3 mb-6">
                                                                    <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                                                        {currentQuestionIndex + 1}
                                                                    </span>
                                                                    <p className="font-semibold text-gray-900 text-xl leading-relaxed">{currentQ.question}</p>
                                                                </div>
                                                                <div className="space-y-3 pl-11">
                                                                    {currentQ.options.map((opt, oIdx) => (
                                                                        <label key={oIdx} className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent ${quizAnswers[currentQuestionIndex] === oIdx ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'hover:bg-white hover:border-gray-200'}`}>
                                                                            <div className="relative flex items-center">
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`q-${quiz.id}-${currentQuestionIndex}`}
                                                                                    value={oIdx}
                                                                                    checked={quizAnswers[currentQuestionIndex] === oIdx}
                                                                                    onChange={() => handleQuizOptionChange(currentQuestionIndex, oIdx)}
                                                                                    className="peer h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                                                                />
                                                                            </div>
                                                                            <span className={`ml-3 font-medium ${quizAnswers[currentQuestionIndex] === oIdx ? 'text-indigo-900' : 'text-gray-700'}`}>{opt}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Navigation Controls */}
                                                            <div className="flex justify-between items-center pt-4">
                                                                <button
                                                                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                                                    disabled={currentQuestionIndex === 0}
                                                                    className={`px-6 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition-colors ${currentQuestionIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    Previous
                                                                </button>

                                                                {currentQuestionIndex < totalQ - 1 ? (
                                                                    <button
                                                                        onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQ - 1, prev + 1))}
                                                                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                                                                    >
                                                                        Next
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => submitQuiz(quiz.id)}
                                                                        disabled={quizSubmitting}
                                                                        className={`px-8 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 hover:-translate-y-1 transition-all duration-300 focus:outline-none ${quizSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                                                                    >
                                                                        {quizSubmitting ? 'Submitting...' : 'Submit Quiz'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                        }
                                    </div>
                                ) : (
                                    <div className="p-12 bg-gray-50 rounded-2xl text-center border-2 border-gray-100 border-dashed">
                                        <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <CheckCircle className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">No knowledge check available</h3>
                                        <p className="text-gray-500 mt-1">This course currently has no quizzes assigned.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Area */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-900">Your Progress</h2>
                                {saving && <span className="text-xs text-indigo-600 font-bold animate-pulse uppercase tracking-wide">Saving...</span>}
                            </div>

                            {/* Circular Progress */}
                            <div className="flex justify-center mb-8">
                                <div className="relative w-32 h-32">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                                        <circle
                                            cx="64" cy="64" r="56"
                                            stroke="currentColor" strokeWidth="8" fill="transparent"
                                            strokeDasharray="351"
                                            strokeDashoffset={351 - (351 * (isCompleted ? 1 : 0))}
                                            className={`${isCompleted ? 'text-green-500' : 'text-gray-200'} transition-all duration-1000 ease-out`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-gray-900">{isCompleted ? 100 : 0}%</span>
                                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Complete</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={!isCompleted}
                                className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-300 mb-6 ${isCompleted ? 'bg-green-100 text-green-700 cursor-default' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-gray-50'}`}>
                                    {isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                                </div>
                                {isCompleted ? 'Completed' : 'In Progress'}
                            </button>

                            <hr className="border-gray-100 mb-6" />

                            <label htmlFor="notes" className="block text-sm font-bold text-gray-900 mb-2">My Notes</label>
                            <textarea
                                id="notes"
                                rows={8}
                                className="block w-full text-sm border-gray-200 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-4 border bg-gray-50 placeholder-gray-400 resize-none transition-shadow duration-200 hover:shadow-md focus:bg-white"
                                placeholder="Jot down key takeaways here..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />

                            <button
                                onClick={() => handleSaveEvents()}
                                className="mt-4 w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-100 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <Save className="mr-2 h-4 w-4" /> Save Notes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
