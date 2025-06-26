import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Only apply to API routes that handle email sending
  if (request.nextUrl.pathname.startsWith('/api/send-email')) {
    // For large email campaigns, we need to handle larger payloads
    const response = NextResponse.next()
    
    // Add custom headers for large request handling
    response.headers.set('x-middleware-cache', 'no-cache')
    
    // Log request size for debugging large payloads
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const sizeInMB = (parseInt(contentLength) / 1024 / 1024).toFixed(2)
      console.log(`📦 Email API request size: ${sizeInMB} MB for ${request.nextUrl.pathname}`)
    }
    
    return response
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/send-email/:path*'
}
