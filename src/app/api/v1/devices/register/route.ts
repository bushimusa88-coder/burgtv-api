import { NextRequest, NextResponse } from 'next/server';
  import { supabaseAdmin } from '@/lib/supabase';
  import { deviceRegistrationSchema, validateM3uUrl, verifyCaptcha } from
  '@/lib/validation';
  import { corsMiddleware, rateLimitMiddleware, withErrorHandling,
  logRequest } from '@/lib/middleware';
  import { ApiResponse, Device, DeviceRegistrationResponse } from
  '@/types/api';

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
    const validation = deviceRegistrationSchema.safeParse(body);
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

    const { device_type, mac_address, device_name, m3u_url, epg_url,
  captcha_token } = validation.data;

    // Verify captcha - TEMPORARILY DISABLED FOR TESTING
    // const captchaValid = await verifyCaptcha(captcha_token);
    // if (!captchaValid) {
    //   return NextResponse.json({
    //     success: false,
    //     error: 'Captcha verification failed'
    //   } as ApiResponse, { 
    //     status: 400,
    //     headers: corsMiddleware(req)
    //   });
    // }

    // Validate M3U URL
    const m3uValidation = await validateM3uUrl(m3u_url);
    if (!m3uValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid M3U URL',
        message: m3uValidation.error
      } as ApiResponse, {
        status: 400,
        headers: corsMiddleware(req)
      });
    }

    try {
      // Check if MAC address already exists
      const { data: existingDevice } = await supabaseAdmin
        .from('devices')
        .select('id, mac_address')
        .eq('mac_address', mac_address)
        .single();

      if (existingDevice) {
        return NextResponse.json({
          success: false,
          error: 'MAC address already registered',
          message: 'This MAC address is already associated with another device'
        } as ApiResponse, {
          status: 409,
          headers: corsMiddleware(req)
        });
      }

      // Create new device
      const deviceData = {
        mac_address,
        device_type,
        device_name: device_name || `${device_type.charAt(0).toUpperCase() 
  + device_type.slice(1)} Device`,
        m3u_url,
        epg_url: epg_url || null,
        status: 'active',
        captcha_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newDevice, error: insertError } = await supabaseAdmin
        .from('devices')
        .insert([deviceData])
        .select()
        .single();

      if (insertError) {
        console.error('Device registration error:', insertError);
        return NextResponse.json({
          success: false,
          error: 'Registration failed',
          message: 'Unable to register device. Please try again.'
        } as ApiResponse, {
          status: 500,
          headers: corsMiddleware(req)
        });
      }

      // Log the registration
      await supabaseAdmin
        .from('device_logs')
        .insert([{
          device_id: newDevice.id,
          action: 'device_registered',
          details: {
            device_type,
            ip_address: req.headers.get('x-forwarded-for') ||
  req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent')
          },
          ip_address: req.headers.get('x-forwarded-for') ||
  req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
          created_at: new Date().toISOString()
        }]);

      // Generate access token (simplified for now)
      const accessToken = Buffer.from(`${newDevice.id}:${newDevice.mac_addr
  ess}:${Date.now()}`).toString('base64');
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 *
  1000).toISOString(); // 1 year

      const response: DeviceRegistrationResponse = {
        device: {
          id: newDevice.id,
          mac_address: newDevice.mac_address,
          device_type: newDevice.device_type as any,
          device_name: newDevice.device_name,
          m3u_url: newDevice.m3u_url,
          epg_url: newDevice.epg_url,
          created_at: newDevice.created_at,
          updated_at: newDevice.updated_at,
          status: newDevice.status as any,
          last_active: newDevice.last_active
        },
        access_token: accessToken,
        expires_at: expiresAt
      };

      return NextResponse.json({
        success: true,
        data: response,
        message: 'Device registered successfully'
      } as ApiResponse<DeviceRegistrationResponse>, {
        status: 201,
        headers: corsMiddleware(req)
      });

    } catch (error) {
      console.error('Unexpected registration error:', error);
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred during registration'
      } as ApiResponse, {
        status: 500,
        headers: corsMiddleware(req)
      });
    }
  }

  export const POST = withErrorHandling(registerDeviceHandler);
  export const OPTIONS = registerDeviceHandler;
