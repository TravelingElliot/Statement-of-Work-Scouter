import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import Anthropic from '@anthropic-ai/sdk';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { analysis, questionAnswers, additionalContext } = await request.json();

    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis is required' },
        { status: 400 }
      );
    }

    // Build search queries based on the analysis
    const searchQueries = buildSearchQueries(analysis, questionAnswers, additionalContext);

    // Search GitHub for repos
    const repos = await searchGitHub(searchQueries);

    if (repos.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'No repositories found matching your requirements',
      });
    }

    // Analyze each repo for SOW coverage
    const analyzedRepos = await Promise.all(
      repos.slice(0, 10).map(async (repo) => {
        const coverage = await analyzeCoverage(repo, analysis);
        return {
          id: repo.id,
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          language: repo.language,
          lastActivity: repo.updated_at,
          url: repo.html_url,
          ...coverage,
        };
      })
    );

    // Filter out repos that don't cover anything from the SOW
    // Also exclude fallback/generic responses
    const relevantRepos = analyzedRepos.filter(repo => {
      if (!repo.covers || repo.covers.length === 0) return false;
      // Exclude if only cover is the generic fallback message
      if (repo.covers.length === 1 && repo.covers[0] === 'Similar functionality detected') return false;
      return true;
    });

    // Sort by coverage percentage
    relevantRepos.sort((a, b) => b.coveragePercentage - a.coveragePercentage);

    return NextResponse.json({
      success: true,
      results: relevantRepos.slice(0, 10),
      message: relevantRepos.length === 0 ? 'No repositories found matching your requirements. Try refining your SOW or additional context.' : undefined,
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Failed to search repositories'
      },
      { status: 500 }
    );
  }
}

function buildSearchQueries(analysis: any, questionAnswers: any, additionalContext: string): string[] {
  const queries: string[] = [];

  // Extract key terms from project type and deliverables
  const projectTerms = analysis.projectType.toLowerCase().split(' ').filter((word: string) => word.length > 3);
  const deliverableTerms = analysis.deliverables.join(' ').toLowerCase().split(' ').filter((word: string) => word.length > 3);

  // Build main query from project type
  const mainTerms = [...new Set([...projectTerms.slice(0, 3), ...deliverableTerms.slice(0, 2)])];
  queries.push(mainTerms.join(' '));

  // Add tech stack if mentioned
  if (analysis.technicalRequirements.length > 0) {
    const techQuery = `${mainTerms[0]} ${analysis.technicalRequirements[0]}`;
    queries.push(techQuery);
  }

  // Add integration-based query
  if (analysis.integrations.length > 0) {
    const integrationQuery = `${mainTerms[0]} ${analysis.integrations[0]}`;
    queries.push(integrationQuery);
  }

  return queries.slice(0, 3);
}

async function searchGitHub(queries: string[]) {
  const allRepos: any[] = [];
  const seenRepoIds = new Set();

  for (const query of queries) {
    try {
      const response = await octokit.search.repos({
        q: `${query} stars:>0`,
        sort: 'stars',
        order: 'desc',
        per_page: 20,
      });

      // Add unique repos
      for (const repo of response.data.items) {
        if (!seenRepoIds.has(repo.id)) {
          seenRepoIds.add(repo.id);
          allRepos.push(repo);
        }
      }
    } catch (error) {
      console.error(`Search error for query "${query}":`, error);
    }
  }

  return allRepos;
}

async function analyzeCoverage(repo: any, analysis: any) {
  try {
    const prompt = `Analyze how well this GitHub repository matches the following project requirements.

Repository:
- Name: ${repo.full_name}
- Description: ${repo.description || 'No description'}
- Language: ${repo.language || 'Unknown'}
- Stars: ${repo.stargazers_count}

Project Requirements:
- Type: ${analysis.projectType}
- Deliverables: ${analysis.deliverables.join(', ')}
- Technical Requirements: ${analysis.technicalRequirements.join(', ')}
- Integrations: ${analysis.integrations.join(', ')}

Provide your analysis in the following JSON format:
{
  "coveragePercentage": 65,
  "covers": ["Feature 1 from deliverables", "Feature 2", "Feature 3"],
  "gaps": ["Missing feature 1", "Missing feature 2", "Missing feature 3"]
}

Guidelines:
- coveragePercentage: Estimate 0-100 how much of the SOW deliverables this repo covers
- covers: List 2-5 specific things this repo handles from the requirements
- gaps: List 2-5 specific things you'd still need to build

Be concise and specific. Return ONLY valid JSON, no additional text.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    const coverage = JSON.parse(responseText);

    return {
      coveragePercentage: coverage.coveragePercentage || 0,
      covers: coverage.covers || [],
      gaps: coverage.gaps || [],
    };

  } catch (error) {
    console.error('Coverage analysis error:', error);
    // Return fallback values
    return {
      coveragePercentage: 30,
      covers: ['Similar functionality detected'],
      gaps: ['Detailed analysis unavailable'],
    };
  }
}
