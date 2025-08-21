import { z } from 'zod';

// MAC Address validation
export const macAddressSchema = z.string()
  .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC address format')
  .transform(mac => mac.toUpperCase().replace(/-/g, ':'));

// Device Type validation
export const deviceTypeSchema = z.enum(['firetv', 'samsung', 'lg', 'appletv', 'android', 'ios']);

// URL validation
export const urlSchema = z.string()
  .url('Invalid URL format')
  .refine(url => url.startsWith('http://') || url.startsWith('https://'), 'URL must use HTTP or HTTPS');

// M3U URL specific validation
export const m3uUrlSchema = urlSchema
  .refine(url => url.includes('.m3u') || url.includes('get.php') || url.includes('playlist'), 
    'URL should be a valid M3U playlist');

// Device registration schema
export const deviceRegistrationSchema = z.object({
  device_type: deviceTypeSchema,
  mac_address: macAddressSchema,
  device_name: z.string().min(1).max(50).optional(),
  m3u_url: m3uUrlSchema,
  epg_url: urlSchema.optional(),
  captcha_token: z.string().optional() // Temporarily optional for testing
});

// Device update schema
export const deviceUpdateSchema = z.object({
  device_name: z.string().min(1).max(50).optional(),
  m3u_url: m3uUrlSchema.optional(),
  epg_url: urlSchema.optional()
}).refine(data => Object.keys(data).length > 0, 'At least one field must be provided');

// MAC address utilities
export function formatMacAddress(mac: string): string {
  return mac.toUpperCase().replace(/[^A-F0-9]/g, '').replace(/(.{2})/g, '$1:').slice(0, -1);
}

export function isValidMacAddress(mac: string): boolean {
  const result = macAddressSchema.safeParse(mac);
  return result.success;
}

// M3U validation
export async function validateM3uUrl(url: string): Promise<{
  isValid: boolean;
  channelCount?: number;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        isValid: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const contentType = response.headers.get('content-type');
    
    // Check if it's likely an M3U file
    if (contentType && (
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('audio/x-mpegurl') ||
      contentType.includes('text/plain') ||
      url.toLowerCase().includes('.m3u')
    )) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: 'URL does not appear to be a valid M3U playlist'
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Captcha verification placeholder
export async function verifyCaptcha(token: string): Promise<boolean> {
  // For now, we'll skip actual captcha verification
  // In production, implement hCaptcha verification here
  return token.length > 0;
}