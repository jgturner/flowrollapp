import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    console.log('🧪 Testing Mux connectivity...');

    // Get MUX credentials from environment variables
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
    const MUX_SECRET_KEY = process.env.MUX_TOKEN_SECRET;

    console.log('🔑 MUX_TOKEN_ID exists:', !!MUX_TOKEN_ID);
    console.log('🔑 MUX_SECRET_KEY exists:', !!MUX_SECRET_KEY);

    if (!MUX_TOKEN_ID || !MUX_SECRET_KEY) {
      return NextResponse.json(
        {
          error: 'MUX credentials not set',
          MUX_TOKEN_ID: !!MUX_TOKEN_ID,
          MUX_SECRET_KEY: !!MUX_SECRET_KEY,
        },
        { status: 500 }
      );
    }

    // Test Mux API connectivity
    console.log('📡 Testing Mux API connection...');
    const testRes = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${MUX_TOKEN_ID}:${MUX_SECRET_KEY}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        new_asset_settings: {
          playback_policy: ['public'],
        },
        cors_origin: '*',
      }),
    });

    console.log('📡 Mux test response status:', testRes.status);

    if (!testRes.ok) {
      const errorText = await testRes.text();
      console.log('❌ Mux test failed:', errorText);
      return NextResponse.json(
        {
          error: `Mux API test failed: ${testRes.status}`,
          details: errorText,
        },
        { status: 500 }
      );
    }

    const testData = await testRes.json();
    console.log('✅ Mux API test successful');

    return NextResponse.json({
      success: true,
      message: 'Mux API connection successful',
      upload_id: testData.data.id,
      status: 'ready',
    });
  } catch (error) {
    console.error('🧪 Test error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
