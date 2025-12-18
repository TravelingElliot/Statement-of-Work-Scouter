'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export default function RepoDetail() {
  const {
    selectedRepo,
    analysis,
    setSelectedRepo,
    isLoadingDetail,
    setIsLoadingDetail,
    setCurrentStep,
  } = useStore();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRepo && !selectedRepo.readmeSummary) {
      fetchDetailedInfo();
    }
  }, [selectedRepo]);

  const fetchDetailedInfo = async () => {
    if (!selectedRepo) return;

    try {
      const response = await fetch('/api/repo-detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: selectedRepo.owner,
          name: selectedRepo.name,
          analysis,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch repository details');
      }

      const data = await response.json();
      setSelectedRepo(data.detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBack = () => {
    setSelectedRepo(null);
    setCurrentStep('results');
  };

  if (isLoadingDetail) {
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
              Loading Repository Details...
            </h2>
            <p className="text-gray-600">
              Analyzing repository health and fit
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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
              <p className="text-red-800 font-medium">Failed to Load Details</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  if (!selectedRepo) return null;

  const healthBadgeColor = {
    active: 'bg-green-100 text-green-800',
    stale: 'bg-yellow-100 text-yellow-800',
    abandoned: 'bg-red-100 text-red-800',
  }[selectedRepo.healthStatus];

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Results
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {selectedRepo.fullName}
            </h1>
            {selectedRepo.description && (
              <p className="text-gray-600 text-lg mb-4">{selectedRepo.description}</p>
            )}
            <a
              href={selectedRepo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              View on GitHub
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Repository Health */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Repository Health</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${healthBadgeColor}`}>
            {selectedRepo.healthStatus.charAt(0).toUpperCase() + selectedRepo.healthStatus.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {selectedRepo.stars.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Stars</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {selectedRepo.forks.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Forks</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {selectedRepo.openIssues.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Open Issues</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {selectedRepo.contributors.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Contributors</div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>Last commit: {new Date(selectedRepo.lastCommit).toLocaleDateString()}</p>
        </div>
      </div>

      {/* README Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">What This Repository Does</h2>
        <p className="text-gray-700 leading-relaxed">{selectedRepo.readmeSummary}</p>
      </div>

      {/* SOW Fit Analysis */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">SOW Fit Analysis</h2>

        {/* What it covers */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            What This Repo Covers
          </h3>
          <ul className="space-y-2">
            {selectedRepo.fitAnalysis.covers.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700">
                <span className="text-green-600 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Gaps */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-orange-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            What You'd Still Need to Build
          </h3>
          <ul className="space-y-2">
            {selectedRepo.fitAnalysis.gaps.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700">
                <span className="text-orange-600 mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Time Saved */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Estimated Time Saved</h3>
          <p className="text-blue-900 font-semibold">{selectedRepo.fitAnalysis.timeSaved}</p>
        </div>

        {/* Recommended Modifications */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Recommended Modifications</h3>
          <ul className="space-y-2">
            {selectedRepo.fitAnalysis.recommendedModifications.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-gray-700">
                <span className="text-blue-600 mt-1">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks & Concerns */}
        {selectedRepo.fitAnalysis.risks.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Risks & Concerns
            </h3>
            <ul className="space-y-2">
              {selectedRepo.fitAnalysis.risks.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-700">
                  <span className="text-red-600 mt-1">⚠</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
