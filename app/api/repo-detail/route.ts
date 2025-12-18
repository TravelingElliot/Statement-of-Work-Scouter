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
    const { owner, name, analysis } = await request.json();

    if (!owner || !name) {
      return NextResponse.json(
        { error: 'Owner and name are required' },
        { status: 400 }
      );
    }

    // Fetch repo details
    const [repoData, contributorsData, readmeData] = await Promise.all([
      octokit.repos.get({ owner, repo: name }),
      octokit.repos.listContributors({ owner, repo: name, per_page: 100 }),
      fetchReadme(owner, name),
    ]);

    const repo = repoData.data;

    // Assess health status
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    let healthStatus: 'active' | 'stale' | 'abandoned' = 'active';
    if (daysSinceUpdate > 365) {
      healthStatus = 'abandoned';
    } else if (daysSinceUpdate > 90) {
      healthStatus = 'stale';
    }

    // Generate README summary and fit analysis
    const aiAnalysis = await generateDetailedAnalysis(
      repo,
      readmeData,
      analysis
    );

    const repoDetail = {
      owner,
      name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      contributors: contributorsData.data.length,
      lastCommit: repo.pushed_at,
      healthStatus,
      readmeSummary: aiAnalysis.readmeSummary,
      fitAnalysis: aiAnalysis.fitAnalysis,
    };

    return NextResponse.json({
      success: true,
      detail: repoDetail,
    });

  } catch (error) {
    console.error('Repo detail error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Failed to fetch repository details'
      },
      { status: 500 }
    );
  }
}

async function fetchReadme(owner: string, name: string): Promise<string> {
  try {
    const response = await octokit.repos.getReadme({
      owner,
      repo: name,
    });

    // Decode base64 content
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');

    // Limit to first 3000 characters for analysis
    return content.slice(0, 3000);
  } catch (error) {
    console.error('README fetch error:', error);
    return 'README not available';
  }
}

async function generateDetailedAnalysis(repo: any, readme: string, analysis: any) {
  try {
    const prompt = `Analyze this GitHub repository in detail for the given project requirements.

Repository:
- Name: ${repo.full_name}
- Description: ${repo.description || 'No description'}
- Language: ${repo.language || 'Unknown'}
- Stars: ${repo.stargazers_count}
- Forks: ${repo.forks_count}
- Open Issues: ${repo.open_issues_count}

README (excerpt):
${readme}

Project Requirements (SOW):
- Type: ${analysis.projectType}
- Deliverables: ${analysis.deliverables.join(', ')}
- Technical Requirements: ${analysis.technicalRequirements.join(', ')}
- Integrations: ${analysis.integrations.join(', ')}

Provide a detailed analysis in the following JSON format:
{
  "readmeSummary": "2-3 sentence concise summary of what this repo does and its key features",
  "fitAnalysis": {
    "covers": ["Detailed feature 1 that matches SOW", "Detailed feature 2", "Feature 3"],
    "gaps": ["Specific missing feature 1", "Missing feature 2", "Missing feature 3"],
    "timeSaved": "Estimated 3-4 weeks vs building from scratch",
    "recommendedModifications": [
      "Add Twilio integration for SMS (~2 days)",
      "Build admin dashboard (~1 week)",
      "Implement feature X (~3 days)"
    ],
    "risks": [
      "jQuery frontend is dated - may need modernization",
      "Concern or risk 2"
    ]
  }
}

Guidelines:
- readmeSummary: Very concise, focus on what it actually does
- covers: 3-5 specific things this repo handles from the SOW
- gaps: 3-5 specific things missing from the SOW
- timeSaved: Realistic estimate with comparison to building from scratch
- recommendedModifications: 3-5 actionable items with time estimates
- risks: 2-4 potential concerns (outdated deps, complexity, etc.)

Be specific and actionable. Return ONLY valid JSON, no additional text.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
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

    const result = JSON.parse(responseText);

    return {
      readmeSummary: result.readmeSummary || 'No summary available',
      fitAnalysis: {
        covers: result.fitAnalysis?.covers || [],
        gaps: result.fitAnalysis?.gaps || [],
        timeSaved: result.fitAnalysis?.timeSaved || 'Unable to estimate',
        recommendedModifications: result.fitAnalysis?.recommendedModifications || [],
        risks: result.fitAnalysis?.risks || [],
      },
    };

  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      readmeSummary: 'Analysis unavailable',
      fitAnalysis: {
        covers: ['Repository features detected'],
        gaps: ['Detailed analysis unavailable'],
        timeSaved: 'Unable to estimate',
        recommendedModifications: ['Further analysis needed'],
        risks: ['Analysis incomplete'],
      },
    };
  }
}
