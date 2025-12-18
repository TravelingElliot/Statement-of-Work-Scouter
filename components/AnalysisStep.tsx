'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export default function AnalysisStep() {
  const {
    sowContent,
    filename,
    analysis,
    setAnalysis,
    questionAnswers,
    setQuestionAnswer,
    additionalContext,
    setAdditionalContext,
    isAnalyzing,
    setIsAnalyzing,
    isSearching,
    setIsSearching,
    setSearchResults,
    setError,
    reset,
  } = useStore();

  const [localError, setLocalError] = useState<string | null>(null);
  const [hasAttemptedAnalysis, setHasAttemptedAnalysis] = useState(false);

  // Auto-trigger analysis when component mounts if we don't have analysis yet
  useEffect(() => {
    if (sowContent && !analysis && !isAnalyzing && !hasAttemptedAnalysis) {
      setHasAttemptedAnalysis(true);
      analyzeSOW();
    }
  }, [sowContent, analysis, isAnalyzing, hasAttemptedAnalysis]);

  const analyzeSOW = async () => {
    setIsAnalyzing(true);
    setLocalError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sowContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze SOW');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze SOW';
      setLocalError(errorMessage);
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuestionChange = (questionId: string, answer: string) => {
    setQuestionAnswer(questionId, answer);
  };

  const canProceed = () => {
    if (!analysis) return false;

    // Check if all questions have been answered
    const allQuestionsAnswered = analysis.questions.every(
      (q) => questionAnswers[q.id]
    );

    return allQuestionsAnswered;
  };

  const handleSearchRepos = async () => {
    setIsSearching(true);
    setLocalError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis,
          questionAnswers,
          additionalContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search repositories');
      }

      const data = await response.json();
      setSearchResults(data.results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search repositories';
      setLocalError(errorMessage);
      setError(errorMessage);
      setIsSearching(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <svg
              className="animate-spin h-12 w-12 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">
              Analyzing Statement of Work...
            </h2>
            <p className="text-gray-600">
              Using AI to extract requirements and generate questions
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (localError) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <svg
              className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-red-800 font-medium">Analysis Failed</p>
              <p className="text-red-700 text-sm mt-1">{localError}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setHasAttemptedAnalysis(false);
                analyzeSOW();
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry Analysis
            </button>
            <button
              onClick={reset}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SOW Analysis</h1>
            <p className="text-gray-600 mt-1">
              {filename && `Source: ${filename}`}
            </p>
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Summary of Understanding
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Project Type
              </h3>
              <p className="text-gray-900">{analysis.projectType}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Core Deliverables
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {analysis.deliverables.map((deliverable, idx) => (
                  <li key={idx} className="text-gray-900">
                    {deliverable}
                  </li>
                ))}
              </ul>
            </div>

            {analysis.technicalRequirements.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Technical Requirements
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.technicalRequirements.map((req, idx) => (
                    <li key={idx} className="text-gray-900">
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.integrations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Integrations Mentioned
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.integrations.map((integration, idx) => (
                    <li key={idx} className="text-gray-900">
                      {integration}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Questions */}
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Help us find the best repositories
        </h2>

        {analysis.questions.map((question) => (
          <div key={question.id} className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900">
              {question.question}
            </h3>
            <div className="space-y-2">
              {question.options.map((option, idx) => (
                <label
                  key={idx}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={questionAnswers[question.id] === option}
                    onChange={(e) =>
                      handleQuestionChange(question.id, e.target.value)
                    }
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Context */}
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Additional Context (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Add any extra details not in the SOW that might help find better matches
          </p>
          <textarea
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Example: Client is non-technical. Already uses Square POS. Needs simple admin UI."
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
          />
        </div>
      </div>

      {/* Search Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSearchRepos}
          disabled={!canProceed() || isSearching}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSearching ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Searching...
            </span>
          ) : (
            'Search GitHub Repositories'
          )}
        </button>
      </div>
    </div>
  );
}
