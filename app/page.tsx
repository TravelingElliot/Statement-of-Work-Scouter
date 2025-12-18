'use client';

import { useState } from 'react';
import UploadStep from '@/components/UploadStep';

export default function Home() {
  const [sowContent, setSOWContent] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const handleUploadComplete = (content: string, filename?: string) => {
    setSOWContent(content);
    setFilename(filename || null);
    console.log('SOW Content:', content);
    console.log('Filename:', filename);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      {!sowContent ? (
        <UploadStep onUploadComplete={handleUploadComplete} />
      ) : (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Upload Successful!</h2>
          <p className="text-gray-600 mb-4">
            File: <span className="font-medium">{filename}</span>
          </p>
          <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm">{sowContent}</pre>
          </div>
          <button
            onClick={() => {
              setSOWContent(null);
              setFilename(null);
            }}
            className="mt-6 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Upload Another
          </button>
        </div>
      )}
    </div>
  );
}
