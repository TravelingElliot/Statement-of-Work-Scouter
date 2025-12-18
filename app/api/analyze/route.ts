import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { sowContent } = await request.json();

    if (!sowContent || typeof sowContent !== 'string') {
      return NextResponse.json(
        { error: 'SOW content is required' },
        { status: 400 }
      );
    }

    // Create the analysis prompt
    const prompt = `You are analyzing a Statement of Work (SOW) document to help find relevant open-source GitHub repositories that could accelerate project delivery.

Analyze the following SOW and extract key information:

<sow>
${sowContent}
</sow>

Provide your analysis in the following JSON format:
{
  "projectType": "Brief description of the project type (e.g., 'Appointment scheduling system for multi-location service business')",
  "deliverables": ["List", "of", "core", "deliverables"],
  "technicalRequirements": ["List", "of", "technical", "requirements", "or", "tech", "stack", "mentioned"],
  "integrations": ["List", "of", "third-party", "integrations", "or", "platforms", "mentioned"],
  "questions": [
    {
      "id": "q1",
      "question": "Context-specific question based on the SOW?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
    },
    {
      "id": "q2",
      "question": "Another context-specific question?",
      "options": ["Option 1", "Option 2", "Option 3"]
    }
  ]
}

IMPORTANT GUIDELINES FOR QUESTIONS:
- Generate 2-4 questions that are SPECIFIC to this SOW content
- Questions should help narrow down the best GitHub repositories
- Ask about ambiguities or gaps in the SOW (e.g., tech stack if not mentioned, deployment preference, priority between features)
- DO NOT ask generic questions like "What language?" for every SOW
- Questions should be contextual and intelligent
- Each question should have 2-4 answer options
- Options should be concise (1-4 words each)

Examples of GOOD questions:
- "The SOW mentions scheduling but no specific tech stack - preferred framework?" (if tech not specified)
- "Priority: rapid deployment or deep customization?" (if both seem possible)
- "Self-hosted solution or cloud-based acceptable?" (if deployment not specified)

Examples of BAD questions:
- "What programming language?" (too generic)
- "Do you want a good solution?" (not useful)

Return ONLY valid JSON, no additional text.`;

    // Call Claude API
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

    // Extract the response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', responseText);
      throw new Error('Failed to parse analysis response');
    }

    // Validate the response structure
    if (!analysis.projectType || !analysis.deliverables || !analysis.questions) {
      throw new Error('Invalid analysis response structure');
    }

    return NextResponse.json({
      success: true,
      analysis,
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Failed to analyze SOW'
      },
      { status: 500 }
    );
  }
}
