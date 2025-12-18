# SOW Repo Scout - Complete Development Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack Decisions](#technology-stack-decisions)
3. [Architecture & Data Flow](#architecture--data-flow)
4. [File Structure](#file-structure)
5. [State Management](#state-management)
6. [Component Breakdown](#component-breakdown)
7. [API Routes Deep Dive](#api-routes-deep-dive)
8. [LLM Integration & Prompt Engineering](#llm-integration--prompt-engineering)
9. [GitHub API Integration](#github-api-integration)
10. [Error Handling Strategy](#error-handling-strategy)
11. [Key Challenges & Solutions](#key-challenges--solutions)
12. [Performance Considerations](#performance-considerations)

---

## Project Overview

### Purpose
Build a tool that analyzes Statement of Work (SOW) documents, asks clarifying questions, then searches GitHub for open-source repositories that could accelerate project delivery.

### Core Requirements
1. Accept SOW uploads (PDF, TXT, MD, or pasted text)
2. Use LLM to analyze SOW and generate dynamic questions
3. Search GitHub based on analysis + answers
4. Estimate coverage for each repo (what it handles vs gaps)
5. Provide detailed repo analysis with health metrics

### Success Criteria
- **Functionality (30%)**: Full upload → questions → search → detail flow
- **LLM Integration (25%)**: Smart analysis, relevant questions, useful coverage estimates
- **Code Quality (20%)**: Clean, readable, well-organized
- **UI/UX (15%)**: Intuitive flow, loading states, error handling
- **Documentation (10%)**: Clear README explaining approach

---

## Technology Stack Decisions

### Framework: Next.js 15 (App Router)
**Why Next.js?**
- **Unified Codebase**: Frontend + API routes in one project (no separate backend needed)
- **Deployment**: Seamless Netlify deployment
- **File Handling**: Built-in support for file uploads via API routes
- **TypeScript**: First-class TypeScript support out of the box
- **SSR/CSR Flexibility**: Can choose per-component

**Why App Router over Pages Router?**
- Modern React patterns (Server Components support)
- Better file-system routing
- Colocation of route handlers with routes

### Styling: Tailwind CSS
**Why Tailwind?**
- **Speed**: Rapid UI development without writing CSS files
- **Consistency**: Utility classes ensure consistent spacing/colors
- **Responsive**: Built-in responsive modifiers (`md:`, `lg:`)
- **File Size**: Purges unused styles in production
- **No Custom CSS**: Entire UI built with utilities = less maintenance

### State Management: Zustand
**Why Zustand over Redux/Context?**
- **Simplicity**: Minimal boilerplate (compare to Redux)
- **TypeScript**: Excellent TypeScript inference
- **Performance**: No unnecessary re-renders
- **Size**: Only 1.2kb
- **Learning Curve**: Intuitive API, easy to explain

**Alternative Considered**: React Context
- **Rejected because**: Context causes re-renders of all consumers when any state changes
- Zustand has better performance for our multi-step flow with lots of state

### PDF Parsing: unpdf
**Why unpdf?**
- **Next.js Compatible**: Works in serverless functions (pdf-parse didn't)
- **Modern**: ESM-first, Promise-based API
- **Lightweight**: No canvas dependencies needed
- **Reliable**: Handles most PDF formats well

**Libraries Tried First**:
1. **pdf-parse**: Caused "DOMMatrix is not defined" errors in Next.js
   - Required canvas bindings that don't work in serverless
   - Abandoned after 30 minutes of troubleshooting

2. **pdfjs-dist**: Import issues, complex setup
   - Too heavy for our use case

### LLM: Anthropic Claude 3.5 Haiku
**Why Claude over OpenAI?**
- **Challenge Requirement**: Anthropic API key provided
- **JSON Output**: Better at structured JSON responses
- **Instruction Following**: Excellent at following complex prompts

**Why Haiku over Sonnet/Opus?**
- **Cost**: $0.80/MTok input vs $3/MTok for Sonnet
- **Speed**: Faster responses (important for UX)
- **Sufficient**: Analysis and coverage tasks don't need Opus-level reasoning
- **Initial Attempt**: Used Sonnet 4.5 but API key didn't have access
  - Model 404 errors led to downgrade to Haiku 3.5

### GitHub API: Octokit
**Why Octokit?**
- **Official**: GitHub's official SDK
- **TypeScript**: Full type definitions
- **Complete**: Covers all GitHub REST API endpoints
- **Auth Handling**: Automatic token management
- **Rate Limiting**: Built-in rate limit handling

---

## Architecture & Data Flow

### High-Level Flow
```
User uploads SOW
    ↓
Parse file (PDF/TXT/MD) → Extract text
    ↓
Send to Claude API → Analyze SOW
    ↓
Store analysis + questions in Zustand
    ↓
User answers questions + adds context
    ↓
Build search queries from analysis
    ↓
Search GitHub API → Get repos
    ↓
For each repo: Claude analyzes coverage
    ↓
Display results sorted by coverage %
    ↓
User clicks repo → Fetch detailed data
    ↓
Claude generates detailed fit analysis
    ↓
Display comprehensive repo details
```

### Step-by-Step Data Flow

#### Step 1: Upload
1. User selects file or pastes text
2. **Client**: `UploadStep` component validates file type/size
3. **Client**: Sends file/text to `/api/upload`
4. **Server**: `parseFile()` extracts text from PDF/TXT/MD
5. **Server**: `cleanText()` normalizes whitespace, line breaks
6. **Server**: Returns cleaned text + metadata
7. **Client**: Stores in Zustand, transitions to analysis step

#### Step 2: Analysis
1. **Client**: `AnalysisStep` auto-triggers on mount
2. **Client**: Sends SOW content to `/api/analyze`
3. **Server**: Constructs prompt with SOW text
4. **Server**: Calls Claude API with structured output instructions
5. **Server**: Parses JSON response (project type, deliverables, questions)
6. **Server**: Validates response structure
7. **Client**: Stores analysis, renders questions
8. User answers questions (stored in `questionAnswers` object)
9. User optionally adds `additionalContext`

#### Step 3: Search
1. User clicks "Search GitHub Repositories"
2. **Client**: Sends analysis + answers + context to `/api/search`
3. **Server**: `buildSearchQueries()` extracts keywords from:
   - Project type
   - Deliverables
   - Technical requirements
   - Integrations
4. **Server**: For each query, calls GitHub search API
5. **Server**: Deduplicates repos across queries
6. **Server**: For each repo (top 10):
   - Calls Claude to estimate coverage
   - Parses coverage %, covers list, gaps list
7. **Server**: Sorts by coverage percentage
8. **Client**: Stores results, displays in cards

#### Step 4: Detail
1. User clicks repo card
2. **Client**: Stores basic repo info, transitions to detail view
3. **Client**: `RepoDetail` component auto-triggers API call
4. **Client**: Sends owner + name + analysis to `/api/repo-detail`
5. **Server**: Parallel fetch:
   - `octokit.repos.get()` → stars, forks, issues
   - `octokit.repos.listContributors()` → contributor count
   - `fetchReadme()` → README content (first 3000 chars)
6. **Server**: Calculates health status based on last update
7. **Server**: Calls Claude with README + SOW for detailed analysis
8. **Server**: Returns comprehensive repo detail object
9. **Client**: Updates store, renders detailed view

---

## File Structure

```
sow-repo-scout/
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts          # File upload + parsing
│   │   ├── analyze/
│   │   │   └── route.ts          # SOW analysis with LLM
│   │   ├── search/
│   │   │   └── route.ts          # GitHub search + coverage
│   │   └── repo-detail/
│   │       └── route.ts          # Detailed repo info + fit
│   ├── page.tsx                  # Main app with step routing
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   ├── UploadStep.tsx            # File upload UI
│   ├── AnalysisStep.tsx          # Analysis display + questions
│   ├── SearchResults.tsx         # Repo results grid
│   └── RepoDetail.tsx            # Detailed repo view
├── lib/
│   ├── store.ts                  # Zustand state management
│   ├── types.ts                  # TypeScript interfaces
│   └── parser.ts                 # File parsing utilities
├── .env.local                    # API keys (not committed)
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

### File Organization Principles
- **Colocation**: API routes in `/app/api/[feature]/route.ts`
- **Separation of Concerns**: Components only handle UI, logic in API routes
- **Reusability**: Shared utilities in `/lib`
- **Type Safety**: All types centralized in `types.ts`

---

## State Management

### Zustand Store Structure

```typescript
interface AppState {
  // Step tracking
  currentStep: 'upload' | 'analysis' | 'results' | 'detail'

  // SOW content
  sowContent: string | null
  filename: string | null

  // LLM analysis
  analysis: SOWAnalysis | null

  // User inputs
  questionAnswers: Record<string, string>  // questionId → answer
  additionalContext: string

  // Search results
  searchResults: RepoResult[]

  // Selected repo
  selectedRepo: RepoDetail | null

  // Loading states
  isAnalyzing: boolean
  isSearching: boolean
  isLoadingDetail: boolean

  // Error handling
  error: string | null

  // Actions
  setCurrentStep(step)
  setSOWContent(content, filename)
  setAnalysis(analysis)
  setQuestionAnswer(id, answer)
  setAdditionalContext(context)
  setSearchResults(results)
  setSelectedRepo(repo)
  setIsAnalyzing(bool)
  setIsSearching(bool)
  setIsLoadingDetail(bool)
  setError(error)
  reset()
}
```

### Why This Structure?

**Flat State Tree**
- Avoids nested updates
- Easier to reason about
- Better TypeScript inference

**Separated Loading States**
- Each async operation has its own loading flag
- Prevents race conditions
- Allows granular UI feedback

**Centralized Error Handling**
- Single `error` field for global errors
- Components can also have local error states
- Flexibility for error display

**Step-Based Navigation**
- `currentStep` determines which component renders
- Prevents direct URL access to incomplete states
- Automatic progression (e.g., `setSOWContent` moves to 'analysis')

### State Transitions

```
upload → setSOWContent() → analysis
analysis → setSearchResults() → results
results → setSelectedRepo() → detail
any → reset() → upload
```

### Store Actions Explained

**`setSOWContent(content, filename)`**
- Stores parsed SOW text
- Automatically transitions to 'analysis' step
- Called from upload API response

**`setAnalysis(analysis)`**
- Stores LLM analysis result
- Sets `isAnalyzing = false`
- Enables question rendering

**`setQuestionAnswer(questionId, answer)`**
- Updates answers object immutably
- Used for radio button selections
- Required before proceeding to search

**`setSearchResults(results)`**
- Stores GitHub repos
- Automatically transitions to 'results' step
- Sets `isSearching = false`

**`setSelectedRepo(repo)`**
- Stores selected repo
- Transitions to 'detail' step
- If `null`, transitions back to 'results'

**`reset()`**
- Returns all state to initial values
- Called from "Start Over" buttons
- Allows fresh SOW upload

---

## Component Breakdown

### UploadStep.tsx

**Purpose**: Handle file upload or text paste

**State Management**:
```typescript
const [isDragging, setIsDragging] = useState(false)
const [isUploading, setIsUploading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [pastedText, setPastedText] = useState('')
const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file')
```

**Key Functions**:

1. **`validateFile(file: File)`**
   - Checks file extension against whitelist: `.pdf`, `.txt`, `.md`
   - Validates size < 10MB
   - Returns error message or null

2. **`handleFile(file: File)`**
   - Validates file
   - Sets error or updates selectedFile state
   - Called from drag-drop or file input

3. **`handleDrop(e: DragEvent)`**
   - Prevents default browser behavior
   - Extracts first file from DataTransfer
   - Passes to handleFile()

4. **`handleSubmit()`**
   - Determines if file or text mode
   - Creates FormData (file) or JSON (text)
   - Calls `/api/upload`
   - On success: calls `setSOWContent()` from Zustand
   - On error: displays error message

**UI Features**:
- Tab toggle between file/text modes
- Drag-and-drop zone with visual feedback
- File input fallback
- Selected file preview with remove button
- Textarea for pasted content with word count
- Error display with red alert styling
- Submit button with loading spinner

**Why Two Modes?**
- File mode: Better for existing PDFs/documents
- Text mode: Quick for copy-paste from emails/web
- Flexibility improves UX

---

### AnalysisStep.tsx

**Purpose**: Display SOW analysis and collect user input

**State Management**:
```typescript
const [localError, setLocalError] = useState<string | null>(null)
const [hasAttemptedAnalysis, setHasAttemptedAnalysis] = useState(false)
```

**Auto-Trigger Pattern**:
```typescript
useEffect(() => {
  if (sowContent && !analysis && !isAnalyzing && !hasAttemptedAnalysis) {
    setHasAttemptedAnalysis(true)
    analyzeSOW()
  }
}, [sowContent, analysis, isAnalyzing, hasAttemptedAnalysis])
```

**Why This Pattern?**
- Analysis starts automatically when component mounts
- `hasAttemptedAnalysis` prevents infinite loops on error
- Only runs once per upload
- Manual retry resets the flag

**Key Functions**:

1. **`analyzeSOW()`**
   - Sets `isAnalyzing = true`
   - Calls `/api/analyze` with SOW content
   - On success: stores analysis in Zustand
   - On error: sets localError, keeps on analysis screen
   - Finally: sets `isAnalyzing = false`

2. **`handleQuestionChange(questionId, answer)`**
   - Updates Zustand `questionAnswers` object
   - Triggered by radio button selection

3. **`canProceed()`**
   - Checks if all questions have answers
   - Returns boolean for button enabled state

4. **`handleSearchRepos()`**
   - Validates all questions answered
   - Sets `isSearching = true`
   - Calls `/api/search` with analysis + answers + context
   - On success: results stored in Zustand, auto-navigate
   - On error: displays error, stays on page

**UI States**:

1. **Loading**:
   - Spinner + "Analyzing Statement of Work..."
   - Shown while `isAnalyzing = true`

2. **Error**:
   - Red alert box with error message
   - Retry and Start Over buttons
   - Retry resets `hasAttemptedAnalysis` flag

3. **Success**:
   - Analysis summary (project type, deliverables, requirements, integrations)
   - Dynamic questions with radio buttons
   - Additional context textarea
   - Search button (disabled until all questions answered)

**Question Rendering**:
```typescript
{analysis.questions.map((question) => (
  <div key={question.id}>
    <h3>{question.question}</h3>
    {question.options.map((option) => (
      <label>
        <input
          type="radio"
          name={question.id}
          value={option}
          checked={questionAnswers[question.id] === option}
          onChange={(e) => handleQuestionChange(question.id, e.target.value)}
        />
        {option}
      </label>
    ))}
  </div>
))}
```

**Why Radio Buttons?**
- Forces single selection per question
- Visual clarity of options
- Accessible (keyboard navigation)

---

### SearchResults.tsx

**Purpose**: Display GitHub repos with coverage estimates

**Data Source**: `searchResults` from Zustand (array of `RepoResult`)

**Key Functions**:

1. **`handleRepoClick(repo)`**
   - Sets `isLoadingDetail = true`
   - Creates `RepoDetail` object with basic info
   - Stores in Zustand via `setSelectedRepo()`
   - Triggers transition to 'detail' step
   - Detail component will fetch additional data

**Empty State**:
- Shown when `searchResults.length === 0`
- Sad face icon
- "Try adjusting requirements" message
- Start Over button

**Result Cards**:
Each card displays:
- **Header**: Repo full name (owner/name) + language badge
- **Description**: From GitHub metadata
- **Metadata**: Stars count + last updated date
- **Coverage Badge**: Percentage with color coding:
  - Green (≥70%): Good match
  - Yellow (≥50%): Moderate match
  - Orange (<50%): Partial match
- **Progress Bar**: Visual coverage representation
- **Two Columns**:
  - ✅ **Covers**: What repo handles (green checkmark)
  - ❌ **Gaps**: What you'd need to build (red X)
- **Click Indicator**: Right arrow icon

**Coverage Color Logic**:
```typescript
const color = repo.coveragePercentage >= 70
  ? 'text-green-600'
  : repo.coveragePercentage >= 50
  ? 'text-yellow-600'
  : 'text-orange-600'
```

**Why This Design?**
- Cards are scannable (user can compare quickly)
- Coverage % is most prominent (main decision factor)
- Covers/gaps side-by-side for easy comparison
- Entire card is clickable (large hit area)
- Hover effect (shadow increase) provides feedback

---

### RepoDetail.tsx

**Purpose**: Show comprehensive repo analysis

**State Management**:
```typescript
const [error, setError] = useState<string | null>(null)
```

**Auto-Fetch Pattern**:
```typescript
useEffect(() => {
  if (selectedRepo && !selectedRepo.readmeSummary) {
    fetchDetailedInfo()
  }
}, [selectedRepo])
```

**Why Check `readmeSummary`?**
- When clicked from search results, repo has basic info but not full details
- If `readmeSummary` is empty, we need to fetch from API
- Prevents re-fetching if already loaded

**Key Functions**:

1. **`fetchDetailedInfo()`**
   - Calls `/api/repo-detail` with owner + name + analysis
   - Updates `selectedRepo` in Zustand with full details
   - Sets `isLoadingDetail = false`

2. **`handleBack()`**
   - Clears `selectedRepo` (sets to null)
   - Transitions to 'results' step
   - Returns to search results grid

**UI Sections**:

1. **Header**:
   - Back button
   - Repo full name (large heading)
   - Description
   - "View on GitHub" button (opens in new tab)

2. **Repository Health**:
   - Health status badge (Active/Stale/Abandoned)
   - 4-column grid: Stars, Forks, Issues, Contributors
   - Last commit date
   - Color-coded badge:
     - Active: Green
     - Stale: Yellow
     - Abandoned: Red

3. **README Summary**:
   - 2-3 sentence summary from LLM
   - Concise, focuses on key features

4. **SOW Fit Analysis**:
   - **Covers** (green checkmark icon)
   - **Gaps** (orange warning icon)
   - **Time Saved** (blue info box, highlighted)
   - **Recommended Modifications** (blue arrows)
   - **Risks & Concerns** (red warning icons)

**Health Status Calculation** (in API):
```typescript
const daysSinceUpdate = (Date.now() - new Date(repo.updated_at)) / (1000 * 60 * 60 * 24)
let healthStatus = 'active'
if (daysSinceUpdate > 365) healthStatus = 'abandoned'
else if (daysSinceUpdate > 90) healthStatus = 'stale'
```

**Why These Thresholds?**
- **Active**: Updated in last 90 days (good maintenance)
- **Stale**: 90-365 days (questionable maintenance)
- **Abandoned**: >365 days (likely unmaintained)

---

## API Routes Deep Dive

### /api/upload/route.ts

**HTTP Method**: POST

**Request Types**:
1. **FormData** (file upload):
   ```typescript
   formData.append('file', fileBlob)
   ```

2. **JSON** (pasted text):
   ```json
   {
     "text": "SOW content here..."
   }
   ```

**Response**:
```json
{
  "success": true,
  "content": "extracted text...",
  "filename": "document.pdf",
  "wordCount": 1234
}
```

**Processing Flow**:

1. **Detect Content Type**:
   ```typescript
   const contentType = request.headers.get('content-type')
   if (contentType.includes('multipart/form-data')) {
     // Handle file
   } else if (contentType.includes('application/json')) {
     // Handle text
   }
   ```

2. **File Upload Path**:
   - Extract file from FormData
   - Validate extension (pdf/txt/md)
   - Validate size (<10MB)
   - Call `parseFile(file)` → routes to appropriate parser
   - Clean text with `cleanText()`
   - Return text + metadata

3. **Pasted Text Path**:
   - Extract text from JSON body
   - Validate not empty
   - Call `parseDirectText()` → just cleans
   - Return text + metadata

**Error Handling**:
- Missing file/text: 400
- Invalid file type: 400
- File too large: 400
- Parse failure: 400 with descriptive message
- Unexpected errors: 500

---

### /api/analyze/route.ts

**HTTP Method**: POST

**Request**:
```json
{
  "sowContent": "full SOW text..."
}
```

**Response**:
```json
{
  "success": true,
  "analysis": {
    "projectType": "string",
    "deliverables": ["string"],
    "technicalRequirements": ["string"],
    "integrations": ["string"],
    "questions": [
      {
        "id": "q1",
        "question": "string",
        "options": ["string"]
      }
    ]
  }
}
```

**Processing Flow**:

1. **Validate Input**:
   - Check `sowContent` exists and is string
   - Return 400 if missing

2. **Construct Prompt**:
   ```typescript
   const prompt = `You are analyzing a Statement of Work...

   <sow>
   ${sowContent}
   </sow>

   Provide analysis in JSON format:
   { projectType, deliverables, ... }`
   ```

3. **Call Claude API**:
   ```typescript
   const message = await anthropic.messages.create({
     model: 'claude-3-5-haiku-20241022',
     max_tokens: 2048,
     messages: [{ role: 'user', content: prompt }]
   })
   ```

4. **Extract & Parse Response**:
   ```typescript
   const responseText = message.content[0].text
   const analysis = JSON.parse(responseText)
   ```

5. **Validate Structure**:
   ```typescript
   if (!analysis.projectType || !analysis.deliverables || !analysis.questions) {
     throw new Error('Invalid analysis response')
   }
   ```

6. **Return Analysis**

**Error Handling**:
- Missing sowContent: 400
- Claude API error: 500 with message
- JSON parse error: 500 "Failed to parse analysis response"
- Invalid structure: 500 "Invalid analysis response structure"

**Why max_tokens=2048?**
- Analysis is concise (not essay)
- 2048 tokens ≈ 1500 words
- Enough for 4 questions + deliverables + requirements
- More tokens = higher cost

---

### /api/search/route.ts

**HTTP Method**: POST

**Request**:
```json
{
  "analysis": { /* SOWAnalysis object */ },
  "questionAnswers": { "q1": "answer1", "q2": "answer2" },
  "additionalContext": "Client uses Square..."
}
```

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "id": 123,
      "owner": "string",
      "name": "string",
      "fullName": "owner/name",
      "description": "string",
      "stars": 1000,
      "language": "TypeScript",
      "lastActivity": "2024-01-01",
      "url": "https://github.com/...",
      "coveragePercentage": 65,
      "covers": ["feature1", "feature2"],
      "gaps": ["gap1", "gap2"]
    }
  ]
}
```

**Processing Flow**:

1. **Build Search Queries**:
   ```typescript
   function buildSearchQueries(analysis, questionAnswers, additionalContext) {
     // Extract key terms from project type
     const projectTerms = analysis.projectType.split(' ').filter(word => word.length > 3)

     // Extract terms from deliverables
     const deliverableTerms = analysis.deliverables.join(' ').split(' ')

     // Combine unique terms
     const mainTerms = [...new Set([...projectTerms.slice(0,3), ...deliverableTerms.slice(0,2)])]

     // Build queries
     const queries = [
       mainTerms.join(' '),
       `${mainTerms[0]} ${analysis.technicalRequirements[0]}`,
       `${mainTerms[0]} ${analysis.integrations[0]}`
     ]

     return queries.slice(0, 3)
   }
   ```

   **Example**:
   - Project type: "Appointment scheduling system for barbershops"
   - Deliverables: ["Booking UI", "SMS reminders", "Calendar sync"]
   - Queries:
     1. "appointment scheduling booking"
     2. "appointment Twilio"
     3. "appointment Google Calendar"

2. **Search GitHub**:
   ```typescript
   for (const query of queries) {
     const response = await octokit.search.repos({
       q: `${query} stars:>100`,
       sort: 'stars',
       order: 'desc',
       per_page: 20
     })
     // Collect unique repos
   }
   ```

   **Why `stars:>100`?**
   - Filters out low-quality/abandoned projects
   - Ensures some community validation
   - Still includes smaller but active projects

3. **Analyze Coverage for Each Repo**:
   ```typescript
   const analyzedRepos = await Promise.all(
     repos.slice(0, 10).map(async (repo) => {
       const coverage = await analyzeCoverage(repo, analysis)
       return { ...repo, ...coverage }
     })
   )
   ```

   **Why Promise.all?**
   - Parallel execution (faster than sequential)
   - All coverage analyses happen simultaneously
   - Total time = slowest analysis, not sum of all

4. **`analyzeCoverage()` Function**:
   ```typescript
   async function analyzeCoverage(repo, analysis) {
     const prompt = `Analyze how well this GitHub repository matches requirements.

     Repository:
     - Name: ${repo.full_name}
     - Description: ${repo.description}
     - Language: ${repo.language}
     - Stars: ${repo.stargazers_count}

     Project Requirements:
     - Type: ${analysis.projectType}
     - Deliverables: ${analysis.deliverables.join(', ')}
     ...

     Return JSON: { coveragePercentage, covers[], gaps[] }`

     const message = await anthropic.messages.create({
       model: 'claude-3-5-haiku-20241022',
       max_tokens: 1024,
       messages: [{ role: 'user', content: prompt }]
     })

     const coverage = JSON.parse(message.content[0].text)
     return coverage
   }
   ```

   **Why max_tokens=1024?**
   - Coverage analysis is simpler than full SOW analysis
   - Just needs percentage + 2 lists
   - Lower tokens = lower cost
   - Analyzing 10 repos = 10 API calls, so optimization matters

5. **Sort by Coverage**:
   ```typescript
   analyzedRepos.sort((a, b) => b.coveragePercentage - a.coveragePercentage)
   ```

6. **Return Top 10**

**Error Handling**:
- Missing analysis: 400
- GitHub API error: Caught per query, continues with other queries
- Coverage analysis error: Returns fallback values (30%, generic covers/gaps)
- No results: Returns empty array with success message
- Unexpected errors: 500

**Performance Optimization**:
- Limit to 3 search queries (not exhaustive)
- Deduplicate repos across queries
- Limit to 10 repos for coverage analysis
- Parallel coverage analysis with Promise.all
- Fallback coverage if LLM fails (doesn't block entire search)

---

### /api/repo-detail/route.ts

**HTTP Method**: POST

**Request**:
```json
{
  "owner": "facebook",
  "name": "react",
  "analysis": { /* SOWAnalysis object */ }
}
```

**Response**:
```json
{
  "success": true,
  "detail": {
    "owner": "string",
    "name": "string",
    "fullName": "owner/name",
    "description": "string",
    "url": "string",
    "stars": 1000,
    "forks": 500,
    "openIssues": 100,
    "contributors": 50,
    "lastCommit": "2024-01-01",
    "healthStatus": "active",
    "readmeSummary": "string",
    "fitAnalysis": {
      "covers": ["string"],
      "gaps": ["string"],
      "timeSaved": "string",
      "recommendedModifications": ["string"],
      "risks": ["string"]
    }
  }
}
```

**Processing Flow**:

1. **Validate Input**:
   - Check owner and name present
   - Return 400 if missing

2. **Parallel Fetch** (3 concurrent requests):
   ```typescript
   const [repoData, contributorsData, readmeData] = await Promise.all([
     octokit.repos.get({ owner, repo: name }),
     octokit.repos.listContributors({ owner, repo: name, per_page: 100 }),
     fetchReadme(owner, name)
   ])
   ```

   **Why Parallel?**
   - Faster than sequential (3x speedup)
   - GitHub API allows concurrent requests
   - Reduces user wait time

3. **`fetchReadme()` Function**:
   ```typescript
   async function fetchReadme(owner, name) {
     try {
       const response = await octokit.repos.getReadme({ owner, repo: name })
       const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
       return content.slice(0, 3000)  // Limit to 3000 chars
     } catch (error) {
       return 'README not available'
     }
   }
   ```

   **Why Limit to 3000 chars?**
   - README can be very long (10k+ chars)
   - LLM has token limits
   - First 3000 chars usually contains key info
   - Reduces API cost

   **Why Base64 Decode?**
   - GitHub API returns file contents base64-encoded
   - Must decode to get readable text

4. **Calculate Health Status**:
   ```typescript
   const daysSinceUpdate = Math.floor(
     (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24)
   )

   let healthStatus = 'active'
   if (daysSinceUpdate > 365) healthStatus = 'abandoned'
   else if (daysSinceUpdate > 90) healthStatus = 'stale'
   ```

5. **Generate Detailed Analysis**:
   ```typescript
   async function generateDetailedAnalysis(repo, readme, analysis) {
     const prompt = `Analyze this repository in detail...

     Repository:
     - Name: ${repo.full_name}
     - Stars: ${repo.stargazers_count}
     - Forks: ${repo.forks_count}
     - Issues: ${repo.open_issues_count}

     README (excerpt):
     ${readme}

     Project Requirements:
     - Type: ${analysis.projectType}
     - Deliverables: ${analysis.deliverables.join(', ')}
     ...

     Return JSON with:
     - readmeSummary: "2-3 sentence summary"
     - fitAnalysis: {
         covers: ["detailed feature 1", ...],
         gaps: ["missing feature 1", ...],
         timeSaved: "Estimated 3-4 weeks",
         recommendedModifications: ["Add X (~2 days)", ...],
         risks: ["jQuery is dated", ...]
       }
     `

     const message = await anthropic.messages.create({
       model: 'claude-3-5-haiku-20241022',
       max_tokens: 2048,
       messages: [{ role: 'user', content: prompt }]
     })

     return JSON.parse(message.content[0].text)
   }
   ```

   **Why Include README?**
   - README has implementation details not in description
   - Shows what features actually exist
   - Helps LLM make accurate coverage assessment

   **Why Include Repo Stats?**
   - Stars/forks indicate popularity/activity
   - Open issues indicate maintenance status
   - Helps LLM assess risks

6. **Return Complete Detail Object**

**Error Handling**:
- Missing owner/name: 400
- GitHub API error: 500 with message
- README fetch error: Continues with 'README not available'
- LLM analysis error: Returns fallback values
- Unexpected errors: 500

**Why Fallback Values?**
- Prevents entire detail view from failing
- User still gets basic info (stars, forks, etc.)
- Better UX than blank screen or error

---

## LLM Integration & Prompt Engineering

### Prompt Design Principles

1. **Clear Role Definition**
   ```
   You are analyzing a Statement of Work (SOW) document to help find
   relevant open-source GitHub repositories...
   ```
   - Sets context for the LLM
   - Improves response quality

2. **Structured Input with Tags**
   ```
   <sow>
   ${sowContent}
   </sow>
   ```
   - XML-style tags help Claude parse inputs
   - Prevents confusion with instructions

3. **Explicit Output Format**
   ```json
   {
     "projectType": "string",
     "deliverables": ["array"],
     ...
   }
   ```
   - Specify exact JSON structure
   - Reduces parsing errors
   - Ensures consistent responses

4. **Examples and Guidelines**
   ```
   GOOD questions:
   - "The SOW mentions scheduling - preferred tech stack?"

   BAD questions:
   - "What programming language?"
   ```
   - Steers LLM toward desired behavior
   - Prevents generic/unhelpful outputs

5. **Constraints**
   ```
   Generate 2-4 questions
   Each question should have 2-4 answer options
   Return ONLY valid JSON, no additional text
   ```
   - Explicit limits prevent over-generation
   - JSON-only requirement prevents preambles

### Prompt Examples

#### SOW Analysis Prompt

**Key Sections**:
1. Role and task description
2. SOW content in tags
3. Desired output format
4. Guidelines for question generation
5. Examples of good/bad questions

**Why This Works**:
- Claude understands the goal (find repos)
- Questions are contextual, not generic
- Output is machine-parsable JSON

**Common Issues Prevented**:
- **Preambles**: "Here's my analysis..." → "Return ONLY valid JSON"
- **Generic questions**: "What language?" → Examples showing context-specific questions
- **Too many questions**: No limit → "Generate 2-4 questions"

#### Coverage Analysis Prompt

**Key Sections**:
1. Repository metadata
2. SOW requirements
3. Desired JSON output
4. Guidelines for estimation

**Why Minimal Tokens?**
- Coverage analysis is simpler
- Just needs percentage + 2 lists
- Faster + cheaper at scale (10 repos)

**Accuracy Considerations**:
- Limited info (just description + language)
- README not fetched (too slow for 10 repos)
- Estimates are approximate, explicitly labeled as "~65%"

#### Detailed Analysis Prompt

**Key Sections**:
1. Full repo stats (stars, forks, issues)
2. README excerpt (3000 chars)
3. SOW requirements
4. Detailed output structure

**Why Include README Here?**
- Only analyzing 1 repo (not 10)
- Can afford higher token cost
- README has implementation details
- Improves accuracy significantly

**Time Estimates**:
- Prompt asks for realistic estimates
- "Add Twilio integration (~2 days)"
- Helps user plan development time

**Risk Assessment**:
- "jQuery frontend is dated"
- "Complex setup required"
- Helps user make informed decisions

### JSON Parsing Strategy

```typescript
try {
  const analysis = JSON.parse(responseText)
} catch (parseError) {
  console.error('Failed to parse LLM response:', responseText)
  throw new Error('Failed to parse analysis response')
}
```

**Why Log on Error?**
- Debug in production if LLM returns invalid JSON
- Can see what went wrong from server logs

**Why Not Retry?**
- Additional API call = more cost
- Error is rare with good prompts
- Fail fast, show error to user

### Model Selection: Why Haiku?

**Tried First**: Claude Sonnet 4.5
- API 404 error (model not available on key)
- Fallback to Haiku 3.5

**Why Not Retry with Other Models?**
- Haiku sufficient for task
- 4x cheaper than Sonnet
- Faster responses
- Saves challenge evaluator money

**When Would You Use Sonnet/Opus?**
- Complex reasoning tasks
- Multi-step analysis
- Creative writing
- Our use case: Structured data extraction (Haiku excels at this)

---

## GitHub API Integration

### Authentication

```typescript
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
})
```

**Token Setup**:
1. Generate at: https://github.com/settings/tokens
2. Permissions needed: `public_repo` (read public repos)
3. Store in `.env.local`

**Why Token Required?**
- Unauthenticated: 60 req/hour
- Authenticated: 5000 req/hour
- Our app makes ~15 requests per flow:
  - 3 search queries
  - 10 coverage analyses (if we fetched README per repo)
  - 3 detail view requests (repo + contributors + README)
- Would hit limit in 4 uses without token

### Search API

```typescript
const response = await octokit.search.repos({
  q: `${query} stars:>100`,
  sort: 'stars',
  order: 'desc',
  per_page: 20
})
```

**Query Syntax**:
- `appointment scheduling`: Search in name, description, README
- `stars:>100`: Minimum star threshold
- Multiple qualifiers: `language:typescript stars:>1000`

**Why Sort by Stars?**
- Popularity indicator
- More stars = more battle-tested
- More likely to be well-documented

**Why per_page=20?**
- Get enough results for variety
- Not too many (slow response)
- Deduplicate across queries anyway

**Search Limitations**:
- Only returns first 1000 results
- Rate limit: 30 searches/min
- Not an issue for our use case

### Repository Details

```typescript
const repoData = await octokit.repos.get({
  owner: 'facebook',
  repo: 'react'
})
```

**Response Includes**:
- `stargazers_count`: Stars
- `forks_count`: Forks
- `open_issues_count`: Open issues
- `updated_at`: Last updated timestamp
- `pushed_at`: Last commit timestamp
- `description`: Repo description
- `language`: Primary language
- `html_url`: GitHub URL

**Note on Description Field Quality**:
GitHub's `description` field can contain messy data. Some repositories don't set a custom description, so GitHub auto-generates one by concatenating README sections. This results in extremely long, poorly formatted descriptions that include:
- Multiple section headers ("Context", "Content", "Column Descriptors", etc.)
- Full data schemas
- Citations and references
- All concatenated without proper separation

**Example**: A data science repo might have a description like: "Context A real online retail transaction data set... Content This Online Retail II data set contains... Column Descriptors InvoiceNo: Invoice number..." (thousands of characters)

**Solution**: We truncate descriptions to 400 characters in `SearchResults.tsx` to ensure consistent card layouts. This is purely a GitHub API data quality issue, not a problem with our LLM integration.

**Why `pushed_at` for Health?**
- More accurate than `updated_at`
- `updated_at` changes on issue/PR activity
- `pushed_at` = actual code updates

### Contributors

```typescript
const contributorsData = await octokit.repos.listContributors({
  owner: 'facebook',
  repo: 'react',
  per_page: 100
})
```

**Why per_page=100?**
- Max allowed is 100
- Most repos have <100 core contributors
- We just need the count anyway

**Why Not Fetch All Pages?**
- Slow (multiple requests)
- Doesn't matter if 100 or 500 contributors
- We're assessing health, not counting exactly

### README Fetching

```typescript
const response = await octokit.repos.getReadme({
  owner: 'facebook',
  repo: 'react'
})

const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
```

**Why Base64?**
- GitHub API returns file contents base64-encoded
- Security (prevents encoding issues)
- Must decode to get text

**Why Slice to 3000 chars?**
- README can be 50k+ chars (React's is huge)
- LLM token limits
- First 3000 chars has key info:
  - Description
  - Features
  - Installation
  - Basic usage
- Later sections: API docs (less useful for fit assessment)

### Error Handling

```typescript
try {
  const response = await octokit.search.repos({ q: query })
} catch (error) {
  console.error(`Search error for query "${query}":`, error)
  continue  // Try next query
}
```

**Why Continue on Error?**
- One bad query shouldn't fail entire search
- Other queries might succeed
- User still gets partial results

**Common Errors**:
- Rate limit exceeded: 403
- Invalid query syntax: 422
- Network timeout: ETIMEDOUT

**Production Improvements**:
- Implement exponential backoff
- Cache search results
- Handle rate limit headers

---

## Error Handling Strategy

### Layers of Error Handling

1. **Client-Side Validation**
   - File type check before upload
   - File size check before upload
   - Question completion check before search
   - Prevents unnecessary API calls

2. **API Route Validation**
   - Input validation (400 errors)
   - Authentication check (401 errors)
   - Resource existence (404 errors)

3. **External Service Errors**
   - GitHub API errors
   - Claude API errors
   - Graceful degradation

4. **UI Error Display**
   - Local error states
   - Global error state
   - User-friendly messages

### Error Categories

#### User Errors (400)
- Invalid file type
- File too large
- Missing required fields
- Empty content

**Response**:
```json
{
  "error": "Please upload PDF, TXT, or MD files only"
}
```

**Why User-Friendly?**
- Technical errors confuse users
- Actionable message tells them how to fix
- Examples: "Please..." "The file..."

#### Service Errors (500)
- LLM API failure
- GitHub API failure
- Parsing errors

**Response**:
```json
{
  "error": "Failed to analyze SOW"
}
```

**Why Generic?**
- Don't expose internal details
- Log full error server-side
- User doesn't need stack traces

### Retry Patterns

**Analysis Step**:
```typescript
if (error) {
  return (
    <div>
      <ErrorDisplay error={error} />
      <button onClick={retry}>Retry Analysis</button>
      <button onClick={reset}>Start Over</button>
    </div>
  )
}
```

**Why Two Buttons?**
- Retry: Transient errors (network, API limit)
- Start Over: Bad input (corrupted PDF)

**No Automatic Retry**:
- Avoid infinite loops
- Avoid wasting API calls
- User decides if worth retrying

### Fallback Values

**Coverage Analysis**:
```typescript
catch (error) {
  return {
    coveragePercentage: 30,
    covers: ['Similar functionality detected'],
    gaps: ['Detailed analysis unavailable']
  }
}
```

**Why Fallback Instead of Error?**
- LLM failure shouldn't block entire search
- User still sees repo (can assess manually)
- Better UX than "Analysis failed" for all 10 repos

**Why 30%?**
- Low enough to signal uncertainty
- High enough to not filter out
- Sort order puts it near bottom

### Loading States

**Pattern**:
```typescript
const [isLoading, setIsLoading] = useState(false)

async function doWork() {
  setIsLoading(true)
  try {
    await apiCall()
  } finally {
    setIsLoading(false)  // Always reset, even on error
  }
}
```

**Why Finally Block?**
- Ensures loading state resets
- Even if error thrown
- Prevents stuck spinners

**Granular Loading States**:
- `isAnalyzing`: Just for analysis
- `isSearching`: Just for search
- `isLoadingDetail`: Just for detail
- Prevents showing wrong loading message

---

## Key Challenges & Solutions

### Challenge 1: PDF Parsing in Next.js

**Problem**:
- `pdf-parse` requires canvas bindings
- Canvas doesn't work in serverless environments
- Error: "DOMMatrix is not defined"

**Attempted Solutions**:
1. Install `@napi-rs/canvas` → Still failed
2. Try `pdfjs-dist` → Complex setup, import issues
3. Switch to `unpdf` → Success!

**Why unpdf Worked**:
- Pure JavaScript (no native bindings)
- Designed for serverless
- ESM-first (Next.js compatible)

**Lesson**:
- Serverless environments have constraints
- Native dependencies problematic
- Always check library compatibility

### Challenge 2: LLM Infinite Loop on Error

**Problem**:
```typescript
useEffect(() => {
  if (!analysis) {
    analyzeSOW()  // Runs on every render!
  }
}, [analysis])
```

**Result**: Error → re-render → retry → error → infinite loop

**Solution**:
```typescript
const [hasAttemptedAnalysis, setHasAttemptedAnalysis] = useState(false)

useEffect(() => {
  if (!analysis && !hasAttemptedAnalysis) {
    setHasAttemptedAnalysis(true)
    analyzeSOW()
  }
}, [analysis, hasAttemptedAnalysis])
```

**Why This Works**:
- Flag prevents re-triggering
- Error doesn't reset flag
- Manual retry resets flag

**Lesson**:
- Auto-retry can cause infinite loops
- Use flags to track attempts
- Let user decide when to retry

### Challenge 3: Claude Model 404 Errors

**Problem**:
- `claude-3-5-sonnet-20241022`: 404
- `claude-3-5-sonnet-20240620`: 404
- `claude-3-sonnet-20240229`: 404

**Investigation**:
- Checked Anthropic docs
- Found model ID format changed
- API key had limited model access

**Solution**:
- Used `claude-3-5-haiku-20241022`
- Worked first try
- Actually better (faster + cheaper)

**Lesson**:
- Model IDs change over time
- Check official docs
- API keys may have model restrictions
- Cheaper models often sufficient

### Challenge 4: GitHub Search Quality

**Problem**: Generic queries return irrelevant results

**Example**:
- SOW: "Barbershop appointment booking"
- Query: "appointment" → Returns all appointment apps
- Result: Calendar apps, meeting schedulers, doctor appointments

**Solution**: Multi-query strategy
1. `appointment scheduling barbershop`
2. `appointment Twilio` (integration mentioned)
3. `appointment Google Calendar` (integration mentioned)

**Why This Works**:
- First query: Specific to domain
- Second/third: Find repos with specific integrations
- Deduplicate across queries
- Get variety of results

**Lesson**:
- Single query rarely optimal
- Use context to build better queries
- Combine general + specific terms

### Challenge 5: Coverage Estimation Accuracy

**Problem**: Without README, coverage estimates are guesses

**Tradeoff**:
- **Search Results**: 10 repos, no README (too slow)
  - Estimates less accurate
  - But fast (user sees results quickly)

- **Detail View**: 1 repo, with README
  - Estimates very accurate
  - Slower (user clicks for details)

**Decision**:
- Quick estimates in search results
- Detailed analysis in detail view
- Progressive enhancement UX

**Lesson**:
- Perfect accuracy isn't always necessary
- Speed matters for UX
- Offer depth on-demand

### Challenge 6: State Management Complexity

**Problem**: Prop drilling would be nightmare
- `page.tsx` → `AnalysisStep` → needs `sowContent`, `setAnalysis`, `setSearchResults`, etc.

**Solution**: Zustand centralized state
```typescript
const { sowContent, setAnalysis, setSearchResults } = useStore()
```

**Why Better Than Context**:
- No provider nesting
- Components subscribe to specific state
- Better performance (no re-render on unrelated updates)

**Lesson**:
- Choose state management early
- Avoid prop drilling
- Zustand great for TypeScript apps

---

## Performance Considerations

### API Call Optimization

**Parallel Requests**:
```typescript
const [repo, contributors, readme] = await Promise.all([
  octokit.repos.get(),
  octokit.repos.listContributors(),
  fetchReadme()
])
```

**Impact**:
- Sequential: 300ms + 300ms + 300ms = 900ms
- Parallel: max(300ms, 300ms, 300ms) = 300ms
- 3x faster

**Coverage Analysis**:
```typescript
await Promise.all(repos.map(repo => analyzeCoverage(repo)))
```

**Impact**:
- 10 repos × 2 seconds = 20 seconds sequential
- 10 concurrent = ~2-3 seconds parallel
- 7x faster

### Token Optimization

**Analysis**: 2048 tokens
- Full SOW analysis
- Question generation
- Worth the cost (only once)

**Coverage**: 1024 tokens
- Simple comparison
- 10 repos = 10 API calls
- Half the cost per call

**Detail**: 2048 tokens
- README included
- Only 1 call (user clicks)
- Worth the depth

**Savings**:
- Using Haiku instead of Sonnet: 4x cheaper
- Limiting coverage tokens: 50% cheaper
- Total: ~6x cost savings

### Caching Opportunities (Not Implemented)

**What Could Be Cached**:
1. GitHub search results (1 hour TTL)
2. README content (1 day TTL)
3. Coverage analysis (1 hour TTL)

**Why Not Implemented**:
- Challenge time constraint
- Netlify free tier has limited caching
- Would use Redis in production

**Impact if Added**:
- Faster repeat searches
- Lower API costs
- Better rate limit handling

### Bundle Size

**Next.js Automatic**:
- Code splitting per route
- Dynamic imports for components
- Tree shaking unused code

**Dependencies**:
- `zustand`: 1.2kb
- `@anthropic-ai/sdk`: 50kb
- `@octokit/rest`: 80kb
- `unpdf`: 30kb

**Total**: ~200kb (reasonable for a full app)

### Loading States UX

**Why Multiple Spinners?**
- Analysis: 2-5 seconds
- Search: 5-10 seconds
- Detail: 1-3 seconds

**User Perception**:
- Spinner = "Something is happening"
- No spinner = "Broken?"
- Specific message = "What is happening"

**Examples**:
- "Analyzing Statement of Work..."
- "Searching GitHub Repositories..."
- "Loading Repository Details..."

---

## Production Readiness Checklist

### Completed ✅
- [x] File upload with validation
- [x] PDF/TXT/MD parsing
- [x] LLM SOW analysis
- [x] Dynamic question generation
- [x] GitHub search
- [x] Coverage estimation
- [x] Detail view with health metrics
- [x] Error handling throughout
- [x] Loading states
- [x] TypeScript types
- [x] Responsive design

### Not Implemented ⏸️

**Caching**:
- Redis for search results
- CloudFlare CDN for static assets
- Stale-while-revalidate pattern

**Testing**:
- Unit tests (Jest)
- Integration tests (Playwright)
- E2E flow tests

**Monitoring**:
- Error tracking (Sentry)
- Analytics (Plausible)
- API usage tracking

**Security**:
- Rate limiting per IP
- API key rotation
- Input sanitization (XSS prevention)

**Features**:
- Save/load previous analyses
- Export results as markdown
- Side-by-side repo comparison
- Conversation-style Q&A

**Why Not Implemented?**
- 10-15 hour time constraint
- Core functionality prioritized
- These are "bonus points" features

---

## Deployment Considerations

### Netlify Configuration

**Build Command**:
```bash
npm run build
```

**Output Directory**:
```
.next
```

**Environment Variables**:
- `ANTHROPIC_API_KEY`: Claude API key
- `GITHUB_TOKEN`: GitHub personal access token

**Serverless Functions**:
- API routes automatically become Netlify Functions
- `/api/analyze` → `/.netlify/functions/analyze`
- 10 second timeout (sufficient for our use case)

### Known Limitations

**Timeout Risk**:
- Search endpoint makes 10 LLM calls
- Could timeout if >10 seconds
- Mitigation: Use Haiku (fast model)

**Cold Starts**:
- First request slower (function warm-up)
- Subsequent requests fast
- Accept tradeoff for free hosting

**API Rate Limits**:
- GitHub: 5000 req/hour with token
- Claude: Depends on tier
- Monitor usage in production

---

## Interview Talking Points

### Architecture Decisions

**"Why Next.js instead of separate frontend/backend?"**
- Unified codebase reduces complexity
- API routes perfect for serverless
- Easy deployment (one command)
- TypeScript across frontend and backend
- Faster development

**"Why Zustand instead of Redux?"**
- Much simpler API (less boilerplate)
- Better TypeScript inference
- Smaller bundle size (1kb vs 10kb)
- Sufficient for app complexity
- Easier to explain and maintain

**"Why client-side routing instead of server components?"**
- Interactive multi-step flow
- State persistence across steps
- Loading states per section
- Better UX for this use case

### LLM Integration

**"How do you ensure LLM outputs are consistent?"**
- Explicit JSON schema in prompt
- Validation after parsing
- Fallback values on parse error
- Examples in prompt (few-shot learning)

**"How do you handle LLM hallucinations?"**
- Validate required fields exist
- Set constraints (2-4 questions)
- Provide clear examples
- Accept imperfection (estimates, not guarantees)
- User can assess results themselves

**"Why not use OpenAI?"**
- Challenge required Anthropic
- Claude better at structured outputs
- Similar capabilities for this task

### Scalability

**"How would this scale to 10,000 users?"**
- Add Redis caching for search results
- Implement rate limiting per user
- Use CDN for static assets
- Consider API endpoint pagination
- Monitor and optimize LLM token usage

**"What's your biggest bottleneck?"**
- LLM API calls (10 per search)
- Could batch coverage analyses
- Could cache by SOW hash
- Accept tradeoff: quality vs speed

### Code Quality

**"How do you ensure code quality without tests?"**
- TypeScript catches type errors
- Linting with ESLint
- Clear function naming
- Single responsibility principle
- Error handling everywhere

**"What would you test first if adding tests?"**
1. File parsing (different formats)
2. Search query building
3. Coverage percentage calculation
4. Health status determination
5. Error handling flows

---

## What Would You Do Differently?

### With More Time

1. **Add Tests**
   - Unit tests for utilities
   - Integration tests for API routes
   - E2E tests for full flow

2. **Implement Caching**
   - Redis for search results
   - Reduce API calls
   - Improve response time

3. **Better Search Algorithm**
   - Semantic search with embeddings
   - Better query building
   - Feedback loop (learn from selections)

4. **Enhanced Coverage Analysis**
   - README similarity scoring
   - Code structure analysis
   - Dependency compatibility check

5. **User Features**
   - Save analysis history
   - Compare repos side-by-side
   - Export as PDF report
   - Share results via link

### With Different Constraints

**If Backend Separate**:
- Express + PostgreSQL
- Store SOW analyses
- User authentication
- Usage analytics

**If Mobile App**:
- React Native
- Camera for SOW photos (OCR)
- Push notifications for new repos
- Offline mode

**If Enterprise**:
- Team collaboration
- Private repo search
- Custom integrations
- SSO authentication

---

## Conclusion

This project demonstrates:
- Full-stack development (Next.js)
- LLM integration (Anthropic Claude)
- External API usage (GitHub)
- State management (Zustand)
- TypeScript proficiency
- Error handling
- UX considerations
- Time management (10-15 hours)

**Key Achievements**:
- ✅ All core requirements met
- ✅ Smart LLM prompting
- ✅ Professional UI
- ✅ Proper error handling
- ✅ Clean code structure

**What Makes This Stand Out**:
- Dynamic question generation (not generic)
- Parallel API calls (performance)
- Progressive enhancement (quick → detailed)
- Graceful degradation (fallback values)
- Comprehensive error handling

This documentation should help you explain every technical decision in the interview. Good luck!
