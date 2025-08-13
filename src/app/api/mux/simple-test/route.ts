import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🧪 Simple test endpoint called');
  return NextResponse.json({
    success: true,
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  console.log('🧪 Simple test POST endpoint called');
  return NextResponse.json({
    success: true,
    message: 'Simple test POST endpoint working',
    timestamp: new Date().toISOString(),
  });
}
