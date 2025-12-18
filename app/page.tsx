'use client';

import { useStore } from '@/lib/store';
import UploadStep from '@/components/UploadStep';

export default function Home() {
  const { currentStep, reset } = useStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      {currentStep === 'upload' && <UploadStep />}

      {currentStep === 'analysis' && (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Analysis Step</h2>
          <p className="text-gray-600 mb-4">
            This will show the SOW analysis and questions
          </p>
          <button
            onClick={reset}
            className="mt-6 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}

      {currentStep === 'results' && (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Search Results</h2>
          <p className="text-gray-600 mb-4">
            This will show GitHub repo results
          </p>
          <button
            onClick={reset}
            className="mt-6 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}

      {currentStep === 'detail' && (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Repo Detail</h2>
          <p className="text-gray-600 mb-4">
            This will show detailed repo information
          </p>
          <button
            onClick={reset}
            className="mt-6 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
