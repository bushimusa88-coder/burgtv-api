import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deviceRegistrationSchema, validateM3uUrl, verifyCaptcha } from '@/lib/validation';
import { corsMiddleware, rateLimitMiddleware, withErrorHandling, logRequest } from '@/lib/middleware';
import { ApiResponse, Device, DeviceRegistrationResponse } from '@/types/api';

async function registerDeviceHandler(req: NextRequest): Promise<NextResponse> {
  logRequest(req);
  
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsMiddleware(req)
    });
  }

  const rateLimitResponse = await rateLimitMiddleware(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body;
  try {
    body = await req.json();
  } catch {
    const errorResponse = {
      success: false,
      error: 'Invalid JSON body'
    };
    return NextResponse.json(errorResponse as ApiResponse, { 
      status: 400,
      headers: corsMiddleware(req)
    });
  }

  const validation = deviceRegistrationSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.errors;
    const errorMessages = errors.map(e => e.message);
    const joinedErrors = errorMessages.join('; ');
    
    const errorResponse = {
      success: false,
      error: 'Validation failed',
      message: joinedErrors
    };
    return NextResponse.json(errorResponse as ApiResponse, { 
      status: 400,
      headers: corsMiddleware(req)
    });
  }

  const { device_type, mac_address, device_name, m3u_url, epg_url, captcha_token } = validation.data;

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

  const m3uValidation = await validateM3uUrl(m3u_url);
  if (!m3uValidation.isValid) {
    const errorResponse = {
      success: false,
      error: 'Invalid URL',
      message: 'Bad URL'
    };
    return NextResponse.json(errorResponse as ApiResponse, { 
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
      // Update existing device instead of rejecting
      const currentTime = new Date().toISOString();
      const defaultName = device_type.charAt(0).toUpperCase() + device_type.slice(1) + ' Device';
      
      const updateData = {
        device_type,
        device_name: device_name || defaultName,
        m3u_url,
        epg_url: epg_url || null,
        status: 'active',
        updated_at: currentTime
      };

      const { data: updatedDevice, error: updateError } = await supabaseAdmin
        .from('devices')
        .update(updateData)
        .eq('mac_address', mac_address)
        .select()
        .single();

      if (updateError) {
        console.error('Device update error:', updateError);
        const errorResponse = {
          success: false,
          error: 'Update failed',
          message: 'Try again later'
        };
        return NextResponse.json(errorResponse as ApiResponse, { 
          status: 500,
          headers: corsMiddleware(req)
        });
      }

      // Log the update
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
      const userAgent = req.headers.get('user-agent');
      
      await supabaseAdmin
        .from('device_logs')
        .insert([{
          device_id: updatedDevice.id,
          action: 'device_updated',
          details: {
            device_type,
            ip_address: ipAddress,
            user_agent: userAgent
          },
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: currentTime
        }]);

      const tokenData = updatedDevice.id + ':' + updatedDevice.mac_address + ':' + Date.now();
      const accessToken = Buffer.from(tokenData).toString('base64');
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + oneYear).toISOString();

      const response: DeviceRegistrationResponse = {
        device: {
          id: updatedDevice.id,
          mac_address: updatedDevice.mac_address,
          device_type: updatedDevice.device_type as any,
          device_name: updatedDevice.device_name,
          m3u_url: updatedDevice.m3u_url,
          epg_url: updatedDevice.epg_url,
          created_at: updatedDevice.created_at,
          updated_at: updatedDevice.updated_at,
          status: updatedDevice.status as any,
          last_active: updatedDevice.last_active
        },
        access_token: accessToken,
        expires_at: expiresAt
      };

      const successResponse = {
        success: true,
        data: response,
        message: 'Device updated successfully'
      };
      
      return NextResponse.json(successResponse as ApiResponse<DeviceRegistrationResponse>, {
        status: 200,
        headers: corsMiddleware(req)
      });
    }

    const currentTime = new Date().toISOString();
    const defaultName = device_type.charAt(0).toUpperCase() + device_type.slice(1) + ' Device';
    
    const deviceData = {
      mac_address,
      device_type,
      device_name: device_name || defaultName,
      m3u_url,
      epg_url: epg_url || null,
      status: 'active',
      captcha_verified: true,
      created_at: currentTime,
      updated_at: currentTime
    };

    const { data: newDevice, error: insertError } = await supabaseAdmin
      .from('devices')
      .insert([deviceData])
      .select()
      .single();

    if (insertError) {
      console.error('Device registration error:', insertError);
      const errorResponse = {
        success: false,
        error: 'Registration failed',
        message: 'Try again later'
      };
      return NextResponse.json(errorResponse as ApiResponse, { 
        status: 500,
        headers: corsMiddleware(req)
      });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent');
    const logTime = new Date().toISOString();
    
    await supabaseAdmin
      .from('device_logs')
      .insert([{
        device_id: newDevice.id,
        action: 'device_registered',
        details: {
          device_type,
          ip_address: ipAddress,
          user_agent: userAgent
        },
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: logTime
      }]);

    const tokenData = newDevice.id + ':' + newDevice.mac_address + ':' + Date.now();
    const accessToken = Buffer.from(tokenData).toString('base64');
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + oneYear).toISOString();

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

    const successResponse = {
      success: true,
      data: response,
      message: 'Success'
    };
    
    return NextResponse.json(successResponse as ApiResponse<DeviceRegistrationResponse>, {
      status: 201,
      headers: corsMiddleware(req)
    });

  } catch (error) {
    console.error('Unexpected registration error:', error);
    const errorResponse = {
      success: false,
      error: 'Server error',
      message: 'Try again'
    };
    return NextResponse.json(errorResponse as ApiResponse, { 
      status: 500,
      headers: corsMiddleware(req)
    });
  }
}

export const POST = withErrorHandling(registerDeviceHandler);
export const OPTIONS = registerDeviceHandler;