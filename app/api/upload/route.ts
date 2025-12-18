import { NextRequest, NextResponse } from 'next/server';
import { parseFile, parseDirectText } from '@/lib/parser';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle pasted text (JSON)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { text } = body;

      if (!text || typeof text !== 'string') {
        return NextResponse.json(
          { error: 'Text content is required' },
          { status: 400 }
        );
      }

      try {
        const content = parseDirectText(text);
        const wordCount = content.split(/\s+/).length;

        return NextResponse.json({
          success: true,
          content,
          filename: 'Pasted Text',
          wordCount,
        });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to process text' },
          { status: 400 }
        );
      }
    }

    // Handle file upload (FormData)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedExtensions = ['pdf', 'txt', 'md'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        return NextResponse.json(
          { error: 'Please upload PDF, TXT, or MD files only' },
          { status: 400 }
        );
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size must be under 10MB' },
          { status: 400 }
        );
      }

      // Parse file
      try {
        const content = await parseFile(file);
        const wordCount = content.split(/\s+/).length;

        return NextResponse.json({
          success: true,
          content,
          filename: file.name,
          fileSize: file.size,
          wordCount,
        });
      } catch (error) {
        console.error('File parsing error:', error);
        return NextResponse.json(
          {
            error: error instanceof Error
              ? error.message
              : 'Failed to parse file. Please try a different file or paste the text directly.'
          },
          { status: 400 }
        );
      }
    }

    // Unsupported content type
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
