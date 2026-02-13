import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const QuizGeneratorFromResource = ({ courseId, resources, onQuizGenerated }) => {
    const [selectedResourceId, setSelectedResourceId] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState('');

    // Filter only PDF resources
    const pdfResources = resources?.filter(r =>
        r.file_name?.toLowerCase().endsWith('.pdf')
    ) || [];

    const handleGenerateQuiz = async () => {
        if (!selectedResourceId) {
            toast.error('Please select a PDF resource first');
            return;
        }

        setIsGenerating(true);
        setProgress('Downloading PDF from Supabase...');

        try {
            const token = localStorage.getItem('token');

            setProgress('Extracting text from PDF...');

            const response = await fetch(
                `http://localhost:8000/api/generate-quiz/${courseId}?resource_id=${selectedResourceId}&num_questions=25`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate quiz');
            }

            setProgress('Generating 25 questions with AI...');

            const result = await response.json();

            setProgress('Quiz generated successfully!');

            toast.success(`Successfully generated ${result.num_questions} questions!`);

            // Reset form
            setSelectedResourceId('');
            setProgress('');

            // Callback to parent component
            if (onQuizGenerated) {
                onQuizGenerated(result);
            }

        } catch (error) {
            console.error('Error generating quiz:', error);
            toast.error(error.message || 'Failed to generate quiz');
            setProgress('');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!pdfResources || pdfResources.length === 0) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">No PDF resources available</p>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                    Please upload a PDF resource first to generate a quiz.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-md p-6 mb-6 border border-purple-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-900">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Quiz Generator
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select PDF Resource
                    </label>
                    <select
                        value={selectedResourceId}
                        onChange={(e) => setSelectedResourceId(e.target.value)}
                        disabled={isGenerating}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent
                            disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                    >
                        <option value="">-- Select a PDF --</option>
                        {pdfResources.map((resource) => (
                            <option key={resource.id} value={resource.id}>
                                {resource.file_name} ({resource.file_size})
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleGenerateQuiz}
                    disabled={!selectedResourceId || isGenerating}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold
                        hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generating Quiz...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            Generate 25 AI Questions
                        </>
                    )}
                </button>

                {progress && (
                    <div className={`mt-4 p-4 rounded-lg border ${isGenerating
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-green-50 border-green-200'
                        }`}>
                        <p className={`text-sm flex items-center gap-2 ${isGenerating ? 'text-blue-800' : 'text-green-800'
                            }`}>
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            {progress}
                        </p>
                    </div>
                )}

                <div className="mt-4 p-4 bg-white bg-opacity-60 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-sm text-purple-900 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        How AI Quiz Generation Works:
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1.5">
                        <li className="flex items-start gap-2">
                            <span className="text-purple-600 font-bold">1.</span>
                            <span>Select a PDF resource from your course materials</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-600 font-bold">2.</span>
                            <span>AI downloads and extracts text from the PDF</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-600 font-bold">3.</span>
                            <span>Gemini AI analyzes content and generates 25 MCQ questions</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-600 font-bold">4.</span>
                            <span>Questions are automatically saved to the course</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-600 font-bold">5.</span>
                            <span>Students can immediately take the quiz!</span>
                        </li>
                    </ul>
                    <div className="mt-3 pt-3 border-t border-purple-200">
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                            <span className="font-semibold">⏱️ Processing time:</span>
                            <span>15-40 seconds depending on PDF size</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizGeneratorFromResource;
