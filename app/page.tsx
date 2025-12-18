'use client';

import { useStore } from '@/lib/store';
import UploadStep from '@/components/UploadStep';
import AnalysisStep from '@/components/AnalysisStep';
import SearchResults from '@/components/SearchResults';
import RepoDetail from '@/components/RepoDetail';

export default function Home() {
  const { currentStep } = useStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      {currentStep === 'upload' && <UploadStep />}

      {currentStep === 'analysis' && <AnalysisStep />}

      {currentStep === 'results' && <SearchResults />}

      {currentStep === 'detail' && <RepoDetail />}
    </div>
  );
}
