import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { progressService, courseService, quizService, resourceService } from "../services/api";
import {
    Save, CheckCircle, ArrowLeft, Download, FileText,
    Video as VideoIcon, BookOpen, ChevronRight, Home, XCircle, User, Calendar
} from "lucide-react";
import VideoPlayer from "../components/video/VideoPlayer";

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

    // Fetch details
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch user's assigned courses to verify access and get details
                const myCourses = await courseService.getLearnerCourses();
                // Compare IDs as strings (UUIDs)
                const foundCourse = myCourses.find(c => c.id === id);

                if (!foundCourse) {
                    // Start Learning clicked, but course not in list? API might take a moment or mismatch.
                    // Fallback: try getCourses (in case user is admin or public access)
                    // But for strictly learner app, this redirect is correct if not assigned.
                    console.warn("Course not found in user assignments. Redirecting...");
                    navigate('/learner');
                    return;
                }
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
                    // If 404, we just keep defaults.
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

    // Auto-save Notes Effect
    useEffect(() => {
        if (!initialLoad && course) {
            const timer = setTimeout(() => {
                handleSaveEvents(); // Save 1.5s after last modification
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [notes]); // Do NOT include handleSaveEvents in deps to avoid loops

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
        if (!isCompleted) {
            setIsCompleted(true);
            handleSaveEvents(1.0);
        }
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

            // Auto complete course on passing quiz (optional logic)
            if (result.score >= 70 && !isCompleted) {
                setIsCompleted(true);
                handleSaveEvents();
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
                            {course.video_url ? (
                                <VideoPlayer
                                    url={course.video_url}
                                    onProgress={handleVideoProgress}
                                    onComplete={handleVideoComplete}
                                    initialProgress={playbackPosition}
                                />
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
                            </div>

                            {course.quizzes && course.quizzes.length > 0 ? (
                                <div className="space-y-8">
                                    {course.quizzes.map(quiz => (
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
                                                    <button onClick={() => setQuizResult(null)} className="mt-6 text-sm font-semibold text-gray-600 hover:text-gray-900 underline">
                                                        Retake Quiz
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-8">
                                                    {quiz.questions && quiz.questions.map((q, qIdx) => (
                                                        <div key={qIdx} className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                                            <div className="flex gap-3 mb-4">
                                                                <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                                                    {qIdx + 1}
                                                                </span>
                                                                <p className="font-semibold text-gray-900 text-lg">{q.question}</p>
                                                            </div>
                                                            <div className="space-y-3 pl-11">
                                                                {q.options.map((opt, oIdx) => (
                                                                    <label key={oIdx} className="flex items-center p-3 rounded-xl hover:bg-white cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm">
                                                                        <div className="relative flex items-center">
                                                                            <input
                                                                                type="radio"
                                                                                name={`q-${quiz.id}-${qIdx}`}
                                                                                value={oIdx}
                                                                                checked={quizAnswers[qIdx] === oIdx}
                                                                                onChange={() => handleQuizOptionChange(qIdx, oIdx)}
                                                                                className="peer h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                                                            />
                                                                        </div>
                                                                        <span className="ml-3 text-gray-700 font-medium">{opt}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={() => submitQuiz(quiz.id)}
                                                            disabled={quizSubmitting}
                                                            className={`px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${quizSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                                                        >
                                                            {quizSubmitting ? 'Submitting...' : 'Submit Answers'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
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
                                            strokeDashoffset={351 - (351 * (isCompleted ? 1 : playbackPosition))}
                                            className={`${isCompleted ? 'text-green-500' : 'text-indigo-600'} transition-all duration-1000 ease-out`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-gray-900">{Math.round((isCompleted ? 1 : playbackPosition) * 100)}%</span>
                                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Complete</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsCompleted(!isCompleted)}
                                className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-300 mb-6 ${isCompleted ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-400 bg-white'}`}>
                                    {isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                                </div>
                                {isCompleted ? 'Completed' : 'Mark as Completed'}
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
