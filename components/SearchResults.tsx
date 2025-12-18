'use client';

import { useStore } from '@/lib/store';

export default function SearchResults() {
  const { searchResults, setSelectedRepo, setIsLoadingDetail, reset } = useStore();

  const handleRepoClick = async (repo: any) => {
    setIsLoadingDetail(true);

    // For now, we'll just set the selected repo
    // In the detail view, we'll fetch additional data
    setSelectedRepo({
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      url: repo.url,
      stars: repo.stars,
      forks: 0, // Will be fetched in detail view
      openIssues: 0,
      contributors: 0,
      lastCommit: repo.lastActivity,
      healthStatus: 'active',
      readmeSummary: '',
      fitAnalysis: {
        covers: repo.covers,
        gaps: repo.gaps,
        timeSaved: '',
        recommendedModifications: [],
        risks: [],
      },
    });
  };

  if (searchResults.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            No repositories found
          </h2>
          <p className="mt-2 text-gray-600">
            Try adjusting your requirements or adding more context.
          </p>
          <button
            onClick={reset}
            className="mt-6 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GitHub Search Results</h1>
            <p className="text-gray-600 mt-1">
              Found {searchResults.length} repositories that match your requirements
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

      {/* Results Grid */}
      <div className="grid gap-4">
        {searchResults.map((repo) => (
          <div
            key={repo.id}
            onClick={() => handleRepoClick(repo)}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Repo Name */}
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-semibold text-blue-600 hover:text-blue-700">
                    {repo.fullName}
                  </h2>
                  {repo.language && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {repo.language}
                    </span>
                  )}
                </div>

                {/* Description */}
                {repo.description && (
                  <p className="text-gray-600 mb-4">
                    {repo.description.length > 400
                      ? repo.description.slice(0, 400) + '...'
                      : repo.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {repo.stars.toLocaleString()}
                  </div>
                  <div>
                    Last updated: {new Date(repo.lastActivity).toLocaleDateString()}
                  </div>
                </div>

                {/* Coverage Badge */}
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">SOW Coverage:</span>
                    <span
                      className={`text-lg font-bold ${
                        repo.coveragePercentage >= 70
                          ? 'text-green-600'
                          : repo.coveragePercentage >= 50
                          ? 'text-yellow-600'
                          : 'text-orange-600'
                      }`}
                    >
                      ~{repo.coveragePercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        repo.coveragePercentage >= 70
                          ? 'bg-green-600'
                          : repo.coveragePercentage >= 50
                          ? 'bg-yellow-600'
                          : 'bg-orange-600'
                      }`}
                      style={{ width: `${repo.coveragePercentage}%` }}
                    />
                  </div>
                </div>

                {/* What it covers */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                      <svg
                        className="h-4 w-4 text-green-600"
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
                      Covers
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {repo.covers.slice(0, 3).map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                      <svg
                        className="h-4 w-4 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      You'd still need to build
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {repo.gaps.slice(0, 3).map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Click indicator */}
              <div className="ml-4">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600">
        Click on any repository to view detailed analysis
      </div>
    </div>
  );
}
