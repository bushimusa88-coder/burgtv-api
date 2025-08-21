import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter configuration
const rateLimiter = new RateLimiterMemory({
  keyResolver: (req: NextRequest) => getClientIp(req) || 'anonymous',
  points: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW || '900'), // 15 minutes
});

// CORS middleware
export function corsMiddleware(req: NextRequest) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.get('origin');
  
  const headers = new Headers();
  
  // Check if origin is allowed
  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400');
  
  return headers;
}

// Rate limiting middleware
export async function rateLimitMiddleware(req: NextRequest) {
  try {
    await rateLimiter.consume(getClientIp(req) || 'anonymous');
    return null; // No rate limit hit
  } catch (rejRes: any) {
    const remainingPoints = rejRes?.remainingPoints || 0;
    const msBeforeNext = rejRes?.msBeforeNext || 0;
    
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.round(msBeforeNext / 1000)
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.round(msBeforeNext / 1000).toString(),
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX || '100',
          'X-RateLimit-Remaining': remainingPoints.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString()
        }
      }
    );
  }
}

// Get client IP address
export function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return req.ip || null;
}

// API key validation
export function validateApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
  const validApiKey = process.env.API_SECRET_KEY;
  
  if (!validApiKey) {
    return true; // If no API key is set, allow all requests (development)
  }
  
  return apiKey === validApiKey;
}

// Error handling wrapper
export function withErrorHandling(handler: Function) {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('API Error:', error);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' 
            ? (error instanceof Error ? error.message : 'Unknown error')
            : 'An unexpected error occurred'
        },
        { status: 500 }
      );
    }
  };
}

// Request logging
export function logRequest(req: NextRequest) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent');
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`);
}