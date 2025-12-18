import { create } from 'zustand';
import { AppState, SOWAnalysis, RepoResult, RepoDetail } from './types';

const initialState = {
  currentStep: 'upload' as const,
  sowContent: null,
  filename: null,
  analysis: null,
  questionAnswers: {},
  additionalContext: '',
  searchResults: [],
  selectedRepo: null,
  isAnalyzing: false,
  isSearching: false,
  isLoadingDetail: false,
  error: null,
};

export const useStore = create<AppState>((set) => ({
  ...initialState,

  // Step navigation
  setCurrentStep: (step) => set({ currentStep: step }),

  // SOW content
  setSOWContent: (content, filename) =>
    set({
      sowContent: content,
      filename: filename || null,
      currentStep: 'analysis',
    }),

  // Analysis
  setAnalysis: (analysis) =>
    set({
      analysis,
      isAnalyzing: false,
    }),

  // Question answers
  setQuestionAnswer: (questionId, answer) =>
    set((state) => ({
      questionAnswers: {
        ...state.questionAnswers,
        [questionId]: answer,
      },
    })),

  // Additional context
  setAdditionalContext: (context) =>
    set({ additionalContext: context }),

  // Search results
  setSearchResults: (results) =>
    set({
      searchResults: results,
      currentStep: 'results',
      isSearching: false,
    }),

  // Selected repo
  setSelectedRepo: (repo) =>
    set({
      selectedRepo: repo,
      currentStep: repo ? 'detail' : 'results',
      isLoadingDetail: false,
    }),

  // Loading states
  setIsAnalyzing: (loading) => set({ isAnalyzing: loading }),
  setIsSearching: (loading) => set({ isSearching: loading }),
  setIsLoadingDetail: (loading) => set({ isLoadingDetail: loading }),

  // Error
  setError: (error) => set({ error }),

  // Reset
  reset: () => set(initialState),
}));
