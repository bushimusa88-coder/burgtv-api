import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateM3uUrl } from '@/lib/validation';
import { corsMiddleware, rateLimitMiddleware, withErrorHandling, logRequest } from '@/lib/middleware';
import { ApiResponse, M3UValidationResult } from '@/types/api';

const validatePlaylistSchema = z.object({
  url: z.string().url('Invalid URL format')
});

async function validatePlaylistHandler(req: NextRequest): Promise<NextResponse> {
  logRequest(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsMiddleware(req)
    });
  }

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Invalid JSON body'
    } as ApiResponse, { 
      status: 400,
      headers: corsMiddleware(req)
    });
  }

  // Validate input
  const validation = validatePlaylistSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      message: validation.error.errors.map(e => e.message).join(', ')
    } as ApiResponse, { 
      status: 400,
      headers: corsMiddleware(req)
    });
  }

  const { url } = validation.data;

  try {
    // Validate M3U URL with detailed analysis
    const validationResult = await validateM3uUrlDetailed(url);

    return NextResponse.json({
      success: true,
      data: validationResult
    } as ApiResponse<M3UValidationResult>, {
      headers: corsMiddleware(req)
    });

  } catch (error) {
    console.error('Playlist validation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      message: 'Unable to validate playlist URL'
    } as ApiResponse, { 
      status: 500,
      headers: corsMiddleware(req)
    });
  }
}

// Enhanced M3U validation with detailed analysis
async function validateM3uUrlDetailed(url: string): Promise<M3UValidationResult> {
  try {
    // First check with HEAD request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const headResponse = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'BurgTV-API/1.0'
      }
    });
    clearTimeout(timeoutId);

    if (!headResponse.ok) {
      return {
        isValid: false,
        error: `HTTP ${headResponse.status}: ${headResponse.statusText}`
      };
    }

    const contentType = headResponse.headers.get('content-type');
    const contentLength = headResponse.headers.get('content-length');

    // Check content type
    const validContentTypes = [
      'application/x-mpegurl',
      'audio/x-mpegurl',
      'text/plain',
      'application/octet-stream'
    ];

    const hasValidContentType = contentType && validContentTypes.some(type => 
      contentType.includes(type)
    );

    // If content type is not valid but URL suggests M3U, try to fetch content
    if (!hasValidContentType && !url.toLowerCase().includes('.m3u')) {
      return {
        isValid: false,
        error: 'URL does not appear to be a valid M3U playlist'
      };
    }

    // Try to fetch and analyze content for better validation
    try {
      const contentController = new AbortController();
      const contentTimeoutId = setTimeout(() => contentController.abort(), 15000);
      
      const contentResponse = await fetch(url, {
        method: 'GET',
        signal: contentController.signal,
        headers: {
          'User-Agent': 'BurgTV-API/1.0',
          'Range': 'bytes=0-2048' // Only fetch first 2KB for analysis
        }
      });
      clearTimeout(contentTimeoutId);

      if (contentResponse.ok) {
        const content = await contentResponse.text();
        
        // Analyze M3U content
        const analysis = analyzeM3uContent(content);
        
        return {
          isValid: analysis.isValid,
          channelCount: analysis.channelCount,
          format: analysis.format,
          error: analysis.error
        };
      }
    } catch (contentError) {
      // If content fetch fails but HEAD succeeded, still consider it potentially valid
      console.warn('Content analysis failed, but HEAD request succeeded:', contentError);
    }

    // Basic validation passed
    return {
      isValid: true,
      format: contentType || 'unknown'
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Analyze M3U file content
function analyzeM3uContent(content: string): {
  isValid: boolean;
  channelCount?: number;
  format?: string;
  error?: string;
} {
  if (!content || content.trim().length === 0) {
    return {
      isValid: false,
      error: 'Empty content'
    };
  }

  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Check for M3U header
  const firstLine = lines[0];
  if (!firstLine.startsWith('#EXTM3U')) {
    return {
      isValid: false,
      error: 'Missing #EXTM3U header'
    };
  }

  // Count channels (entries with #EXTINF)
  const channelLines = lines.filter(line => line.startsWith('#EXTINF:'));
  const urlLines = lines.filter(line => 
    !line.startsWith('#') && 
    (line.startsWith('http://') || line.startsWith('https://'))
  );

  // Basic validation: should have matching EXTINF and URL entries
  if (channelLines.length === 0) {
    return {
      isValid: false,
      error: 'No channels found in playlist'
    };
  }

  if (urlLines.length === 0) {
    return {
      isValid: false,
      error: 'No valid URLs found in playlist'
    };
  }

  // Determine format
  let format = 'M3U';
  if (lines.some(line => line.includes('tvg-'))) {
    format = 'M3U Extended';
  }

  return {
    isValid: true,
    channelCount: Math.min(channelLines.length, urlLines.length),
    format
  };
}

export const POST = withErrorHandling(validatePlaylistHandler);
export const OPTIONS = validatePlaylistHandler;