import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Technique update API called');

    const body = await request.json();
    const { playbackId, title, position, description, thumbnailTime, thumbnailUrl, userId } = body;

    console.log('🔧 Update data received:', {
      playbackId,
      title,
      position,
      description,
      thumbnailTime,
      thumbnailUrl,
      userId,
    });

    // Prepare update data
    const updateData = {
      title,
      position,
      description,
      thumbnail_time: thumbnailTime,
      updated_date: new Date().toISOString(),
    };

    // Add custom thumbnail URL if provided
    if (thumbnailUrl) {
      updateData.thumbnail_url = thumbnailUrl;
    }

    console.log('🔧 Final update payload:', updateData);

    // Simple direct UPDATE
    const { data: updateResult, error: updateError } = await supabase
      .from('techniques')
      .update(updateData)
      .eq('mux_playback_id', playbackId)
      .eq('user_id', userId)
      .select();

    console.log('🔧 Supabase update result:', { updateResult, updateError });

    if (updateError) {
      console.error('🔧 Update error:', updateError);
      return NextResponse.json({ error: `Update failed: ${updateError.message}` }, { status: 500 });
    }

    if (!updateResult || updateResult.length === 0) {
      console.error('🔧 No records updated');
      return NextResponse.json({ error: 'No matching record found to update' }, { status: 404 });
    }

    console.log('🔧 Update successful:', updateResult[0]);

    return NextResponse.json({
      success: true,
      data: updateResult[0],
    });
  } catch (error) {
    console.error('🔧 API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
