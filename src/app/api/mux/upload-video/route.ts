import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for database operations
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Video upload API called at:', new Date().toISOString());
    console.log('🚀 Request method:', request.method);
    console.log('🚀 Request headers:', Object.fromEntries(request.headers.entries()));

    // Check if it's a multipart form data request
    const contentType = request.headers.get('content-type') || '';
    console.log('📋 Content-Type:', contentType);

    if (!contentType.includes('multipart/form-data')) {
      console.log('❌ Invalid content type');
      return NextResponse.json(
        {
          error: 'Content-Type must be multipart/form-data',
        },
        { status: 400 }
      );
    }

    // Parse the form data
    console.log('📝 Parsing form data...');
    const formData = await request.formData();
    console.log('📝 Form data keys:', Array.from(formData.keys()));

    const file = formData.get('video') as File;
    const title = formData.get('title') as string;
    const position = formData.get('position') as string;
    const user_id = formData.get('user_id') as string;
    const thumbnail_time = formData.get('thumbnail_time') ? Number(formData.get('thumbnail_time')) : 0; // Default to 0 seconds
    const description = (formData.get('description') as string) || null;

    console.log('📝 File received:', !!file, file?.name, file?.size);
    console.log('📝 Title:', title);
    console.log('📝 Position:', position);
    console.log('📝 User ID:', user_id);

    // Validate required fields
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: 'No video file uploaded',
        },
        { status: 400 }
      );
    }

    if (!title || !position || !user_id) {
      return NextResponse.json(
        {
          error: 'Missing title, position, or user_id',
        },
        { status: 400 }
      );
    }

    // Create the database record immediately with "uploading" status
    console.log('💾 Creating initial record with uploading status...');
    const initialPayload = {
      title: title,
      position: position,
      user_id: user_id,
      thumbnail_time: thumbnail_time,
      description: description,
      status: 'uploading', // Set initial status as uploading
    };

    const { data: initialData, error: initialError } = await supabase.from('techniques').insert([initialPayload]).select();

    if (initialError) {
      console.error('💾 Failed to create initial record:', initialError);
      return NextResponse.json(
        {
          error: 'Failed to create video record',
          details: initialError.message,
        },
        { status: 500 }
      );
    }

    const techniqueId = initialData[0].id;
    console.log('💾 Created initial record with ID:', techniqueId);

    // Return immediately so user can see the uploading status
    // The rest happens in the background
    setTimeout(async () => {
      await processVideoUpload(techniqueId, file);
    }, 0);

    return NextResponse.json(
      {
        techniqueId: techniqueId,
        status: 'uploading',
        message: 'Upload started successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('🔥 Upload API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Background function to handle the actual upload
async function processVideoUpload(techniqueId: string, file: File) {
  try {
    console.log('🎬 Starting background upload for technique:', techniqueId);

    // Get MUX credentials from environment variables
    const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
    const MUX_SECRET_KEY = process.env.MUX_TOKEN_SECRET;

    if (!MUX_TOKEN_ID || !MUX_SECRET_KEY) {
      console.log('❌ MUX credentials missing');
      // Update the record with error status
      await supabase.from('techniques').update({ status: 'error' }).eq('id', techniqueId);
      return;
    }

    // Step 1: Create Mux upload
    console.log('📤 Creating Mux upload...');
    const muxRes = await fetch('https://api.mux.com/video/v1/uploads', {
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

    console.log('📤 Mux response status:', muxRes.status);

    if (!muxRes.ok) {
      const errorText = await muxRes.text();
      return NextResponse.json(
        {
          error: `MUX upload init failed: ${muxRes.status} ${errorText}`,
        },
        { status: 500 }
      );
    }

    const muxData = await muxRes.json();
    const uploadUrl = muxData.data.url;
    const uploadId = muxData.data.id;

    // Step 2: Upload the file to Mux
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file.stream(),
      // @ts-expect-error - duplex is required for Node.js 18+ when sending a body but not in TypeScript types yet
      duplex: 'half',
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      return NextResponse.json(
        {
          error: `MUX file upload failed: ${uploadRes.status} ${errorText}`,
        },
        { status: 500 }
      );
    }

    // Step 3: Poll Mux for asset_id and playback_id
    let assetId: string | null = null;
    let playbackId: string | null = null;

    for (let i = 0; i < 20; i++) {
      const pollRes = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
        method: 'GET',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${MUX_TOKEN_ID}:${MUX_SECRET_KEY}`).toString('base64'),
          'Content-Type': 'application/json',
        },
      });

      if (pollRes.ok) {
        const pollData = await pollRes.json();
        assetId = pollData.data.asset_id;

        if (assetId) {
          // Get playback_id
          const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
            method: 'GET',
            headers: {
              Authorization: 'Basic ' + Buffer.from(`${MUX_TOKEN_ID}:${MUX_SECRET_KEY}`).toString('base64'),
              'Content-Type': 'application/json',
            },
          });

          if (assetRes.ok) {
            const assetData = await assetRes.json();
            playbackId = assetData.data.playback_ids?.[0]?.id;
            if (playbackId) break;
          }
        }
      }

      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Step 4: Update the Supabase record with the playback ID
    if (!playbackId) {
      console.log('❌ Failed to retrieve playback ID from MUX');
      // Update record with error status
      await supabase.from('techniques').update({ status: 'error' }).eq('id', techniqueId);
      return;
    }

    // Update the existing record with the playback ID and change status to draft
    const updatePayload = {
      mux_playback_id: playbackId,
      status: 'draft', // Upload completed, now it's a draft ready for editing
      thumbnail_time: 0, // Set default thumbnail time to 0 seconds
    };

    console.log('💾 About to update techniques record:', updatePayload);

    const { error: updateError } = await supabase.from('techniques').update(updatePayload).eq('id', techniqueId).select();

    if (updateError) {
      console.error('💾 Supabase update failed:', updateError);
      // Update record with error status
      await supabase.from('techniques').update({ status: 'error' }).eq('id', techniqueId);
      return;
    }

    console.log('💾 Supabase update successful - upload complete!');
    console.log('🎯 Background upload finished for technique:', techniqueId);
    console.log('🎯 Playback ID:', playbackId);
  } catch (error) {
    console.error('🔥 Background upload error:', error);
    // Update record with error status
    await supabase.from('techniques').update({ status: 'error' }).eq('id', techniqueId);
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
