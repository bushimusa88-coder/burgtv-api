 import { NextRequest, NextResponse } from 'next/server';
  import { corsMiddleware, logRequest } from '@/lib/middleware';
  import { ApiResponse } from '@/types/api';

  async function registerDeviceHandler(req: NextRequest): 
  Promise<NextResponse> {
    logRequest(req);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: corsMiddleware(req)
      });
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

    // Extract data (no validation for testing)
    const { device_type, mac_address, device_name, m3u_url, epg_url } =
  body;

    // Skip all validation and database - just return success for testing
    const mockResponse = {
      device: {
        id: 'test-' + Date.now(),
        mac_address: mac_address || 'AA:BB:CC:DD:EE:FF',
        device_type: device_type || 'samsung',
        device_name: device_name || 'Test Device',
        m3u_url: m3u_url || 'https://example.com/test.m3u',
        epg_url: epg_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
        last_active: null
      },
      access_token: 'test_token_' + Date.now(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 *
  1000).toISOString()
    };

    return NextResponse.json({
      success: true,
      data: mockResponse,
      message: 'Device registered successfully (TEST MODE - NO DATABASE)'
    } as ApiResponse, {
      status: 201,
      headers: corsMiddleware(req)
    });
  }

  export const POST = registerDeviceHandler;
  export const OPTIONS = registerDeviceHandler;
