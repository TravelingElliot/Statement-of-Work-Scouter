# SOW Repo Scout

A tool that analyzes Statement of Work (SOW) documents, asks clarifying questions, and searches GitHub for open-source repositories that could accelerate project delivery.

**Live Demo**: [Coming soon - will be deployed to Netlify]

## Features

- Upload SOW documents (PDF, TXT, MD) or paste text directly
- AI-powered analysis extracts project requirements and deliverables
- Dynamic question generation based on specific SOW content
- Intelligent GitHub search with coverage estimation
- Detailed repository analysis with health metrics and fit assessment
- Responsive, multi-step workflow with real-time feedback

## Local Setup

### Prerequisites

- Node.js 18+ and npm
- GitHub personal access token
- Anthropic API key (Claude)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sow-repo-scout
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file in the root directory:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GITHUB_TOKEN=your_github_token_here
```

**Getting API Keys:**
- **Anthropic API Key**: Provided for this challenge
- **GitHub Token**: Generate at https://github.com/settings/tokens
  - Requires `public_repo` scope
  - Increases rate limit from 60 to 5000 requests/hour

4. Run the development server:
```bash
npm run dev
```

5. Open http://localhost:3000 in your browser

### Building for Production

```bash
npm run build
npm start
```

## Architecture

### Technology Stack

**Framework**: Next.js 15 (App Router)
- Unified frontend and backend in a single codebase
- API routes for serverless functions
- Built-in TypeScript support
- Optimized for deployment

**Styling**: Tailwind CSS
- Rapid UI development with utility classes
- Responsive design out of the box
- Consistent design system

**State Management**: Zustand
- Minimal boilerplate compared to Redux
- Excellent TypeScript inference
- Performance optimized (selective re-renders)
- Small bundle size (1.2kb)

**LLM Integration**: Anthropic Claude 3.5 Haiku
- Structured JSON outputs
- Cost-effective for analysis tasks
- Fast response times

**GitHub API**: Octokit
- Official GitHub SDK
- Complete REST API coverage
- Automatic authentication handling

**PDF Parsing**: unpdf
- Next.js compatible (works in serverless)
- No native dependencies required
- ESM-first design

### Project Structure

```
/app
  /api
    /upload        - File parsing and text extraction
    /analyze       - SOW analysis with LLM
    /search        - GitHub search with coverage analysis
    /repo-detail   - Detailed repository information
  page.tsx         - Main application with step routing
  layout.tsx       - Root layout
  globals.css      - Global styles

/components
  UploadStep.tsx       - File upload UI
  AnalysisStep.tsx     - Analysis display and questions
  SearchResults.tsx    - Repository results grid
  RepoDetail.tsx       - Detailed repository view

/lib
  store.ts    - Zustand state management
  types.ts    - TypeScript interfaces
  parser.ts   - File parsing utilities
```

## Approach to SOW Analysis

### 1. Document Parsing

Files are uploaded via API routes where they're parsed based on type:
- **PDF**: Extracted using unpdf library (text-only, no OCR)
- **TXT/MD**: Read directly as UTF-8 text
- **Pasted**: Accepted as plain text

Text is cleaned to normalize whitespace and line breaks while preserving structure.

### 2. LLM Analysis

The parsed SOW is sent to Claude with a structured prompt that:
- Defines the context (finding GitHub repos to accelerate delivery)
- Provides the full SOW text in XML-style tags
- Specifies exact JSON output format
- Includes guidelines for question generation
- Provides examples of good vs bad questions

**Key Prompt Engineering Decisions:**
- XML tags (`<sow>...</sow>`) help Claude parse inputs clearly
- Explicit JSON schema reduces parsing errors
- Examples steer the model away from generic questions
- Constraints (2-4 questions, 2-4 options) prevent over-generation

### 3. Question Generation

Questions are dynamically generated based on SOW content, not generic templates.

**Example SOW**: "Appointment booking system with SMS reminders"
- Good: "The SOW mentions SMS but no provider - preferred service?"
- Bad: "What programming language do you want?"

The goal is to ask about ambiguities, gaps, or unspecified technical details that would help narrow the GitHub search.

### 4. Context Collection

Users provide:
- Answers to all generated questions (required)
- Optional additional context (free-form text field)

This information is combined with the SOW analysis to build better search queries.

## Coverage Estimation

### Search Results (Initial Estimate)

When displaying search results, coverage is estimated using Claude with limited information:

**Input to LLM:**
- Repository name, description, language, star count
- SOW deliverables and requirements

**Output:**
- Coverage percentage (0-100)
- What the repo covers from the SOW
- What gaps remain

**Limitations:**
- No README content at this stage (too slow for 10 repos)
- Estimates are approximate and labeled as such (~65%)
- Based on matching deliverables to repo metadata

**Why This Approach:**
- Fast (parallel LLM calls for all repos)
- Good enough for sorting/filtering results
- Users can click for detailed analysis

### Detail View (Comprehensive Analysis)

When a user clicks a repository:

**Additional Data Fetched:**
- Full repository metadata (stars, forks, issues, contributors)
- README content (first 3000 characters)
- Last commit date for health assessment

**Enhanced LLM Prompt:**
- Includes README excerpt with implementation details
- Repo health indicators
- SOW requirements

**Output:**
- README summary (2-3 sentences)
- Detailed coverage breakdown
- Time saved estimate vs building from scratch
- Recommended modifications with time estimates
- Risks and concerns

**Health Status Calculation:**
- Active: Last updated within 90 days
- Stale: 90-365 days since update
- Abandoned: Over 365 days since update

## Key Design Decisions

### Multi-Step Workflow

The application uses a step-based approach:
1. Upload
2. Analysis
3. Results
4. Detail

**Why:**
- Breaks complex task into manageable chunks
- Provides clear progress indication
- Allows users to refine at each stage
- Natural pause points for review

### Parallel API Calls

Coverage analysis for 10 repos happens concurrently:
```typescript
await Promise.all(repos.map(repo => analyzeCoverage(repo)))
```

**Impact:**
- 10 sequential calls = 20+ seconds
- 10 parallel calls = 2-3 seconds
- 7x faster user experience

### Progressive Enhancement

- Quick estimates in search results (no README)
- Detailed analysis on demand (includes README)
- Trades perfect accuracy for speed in list view
- Provides depth when user expresses interest

### Error Handling Strategy

**Graceful Degradation:**
- If coverage analysis fails for one repo, return fallback values
- If search query fails, continue with other queries
- Always provide partial results rather than complete failure

**User Control:**
- Manual retry buttons (no auto-retry to avoid loops)
- Clear error messages with actionable guidance
- "Start Over" option always available

## Known Limitations

### 1. PDF Parsing

- Text-only extraction, doesn't work for scanned documents
- Complex layouts may produce messy output
- Tables and images are not processed
- Mitigation: Users can paste text as alternative

### 2. Coverage Accuracy

- Search results use description only (no README)
- Estimates can vary between runs
- No actual code analysis
- Labeled as approximate to set expectations

### 3. GitHub API Data Quality

Some repositories have poor metadata:
- Auto-generated descriptions concatenate all README sections
- Can result in thousand-character descriptions
- Mitigation: Truncate to 400 characters in UI

### 4. Search Query Quality

Generic SOWs produce generic searches:
- "Software for managing customers" → Very broad results
- Works best with specific requirements
- Limited by quality of SOW input

### 5. Rate Limits

- GitHub: 5000 requests/hour with token
- Claude: Depends on API tier
- No caching implemented
- Could hit limits with heavy usage

### 6. No Persistence

- No database or file storage
- Analysis results lost on page refresh
- Each SOW must be re-uploaded
- State only persists in browser memory

## What I'd Improve With More Time

### Testing
- Unit tests for parsing utilities
- Integration tests for API routes
- E2E tests for full workflow
- Error case coverage

### Caching
- Redis for search results (1 hour TTL)
- GitHub README caching (24 hour TTL)
- Reduce redundant API calls
- Improve response times for repeated searches

### Enhanced Search
- Semantic search with embeddings
- Better query building from vague SOWs
- Filtering by language, stars, activity
- Pagination for larger result sets, instead of limiting to 10

### User Features
- Save/load previous SOW analyses
- Compare repositories side-by-side
- Export results as PDF or Markdown
- Share analysis via URL
- SOW edit/refine before searching

### Coverage Improvements
- Code structure analysis
- Dependency compatibility checking
- More accurate time estimates
- Integration feasibility assessment

### Production Readiness
- Error tracking (Sentry)
- Usage analytics
- Rate limiting per IP
- API usage monitoring
- Automated deployment pipeline
- Performance monitoring

### UI/UX Enhancements
- Dark mode support
- Keyboard shortcuts
- Conversation-style Q&A (vs form-based)
- Inline SOW editing
- Progress persistence across refreshes

## Technical Challenges Solved

### PDF Parsing in Serverless

**Problem**: `pdf-parse` requires canvas bindings that don't work in Next.js serverless functions

**Solution**: Switched to `unpdf` library which is pure JavaScript and serverless-compatible

### LLM Error Loops

**Problem**: Auto-triggering analysis on component mount caused infinite retry loops on errors

**Solution**: Added `hasAttemptedAnalysis` flag to prevent automatic retries, allowing manual user retry only

### Model Availability

**Problem**: Initial model choices (`claude-3-5-sonnet`) returned 404 errors

**Solution**: Downgraded to `claude-3-5-haiku` which was available on the API key and actually better suited (faster, cheaper) for the structured analysis tasks

### Search Result Quality

**Problem**: Single broad query returned irrelevant results

**Solution**: Multi-query strategy using project type + integrations + technical requirements, with deduplication across results

