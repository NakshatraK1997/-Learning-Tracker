import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const AutoQuizGenerator = ({ courseId, onQuizGenerated }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState('');

    const handleAutoGenerate = async () => {
        setIsGenerating(true);
        setProgress('Finding PDF resources...');

        try {
            const token = localStorage.getItem('token');

            setProgress('Extracting text from PDF...');

            const response = await fetch(
                `http://localhost:8000/api/courses/${courseId}/auto-generate-quiz`,
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

            toast.success(`Generated ${result.num_questions} questions from ${result.resource_used}!`);

            // Callback to parent to refresh course data
            if (onQuizGenerated) {
                onQuizGenerated(result);
            }

        } catch (error) {
            console.error('Error generating quiz:', error);
            toast.error(error.message || 'Failed to generate quiz');
        } finally {
            setIsGenerating(false);
            setProgress('');
        }
    };

    return (
        <div className="p-12 bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl text-center border-2 border-purple-200 border-dashed">
            <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Sparkles className="w-10 h-10 text-purple-600" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Knowledge Check Available</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                This course doesn't have a quiz yet. We can automatically generate one from your PDF resources using AI!
            </p>

            {progress && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
                    <p className="text-sm text-blue-800 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {progress}
                    </p>
                </div>
            )}

            <button
                onClick={handleAutoGenerate}
                disabled={isGenerating}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl
                    hover:from-purple-700 hover:to-blue-700 transition-all duration-300 hover:-translate-y-1
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    flex items-center gap-3 mx-auto"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Quiz...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-5 h-5" />
                        Auto-Generate 25 Questions
                    </>
                )}
            </button>

            <div className="mt-6 p-4 bg-white bg-opacity-60 rounded-lg max-w-md mx-auto">
                <p className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Uses AI to create questions from your PDF resources (15-40 seconds)</span>
                </p>
            </div>
        </div>
    );
};

export default AutoQuizGenerator;
