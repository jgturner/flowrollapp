import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: NextRequest) {
  try {
    console.log('🖼️ Custom thumbnail upload API called');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('🖼️ File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      userId: userId,
    });

    // Create storage path
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storagePath = `${userId}/${fileName}`;

    console.log('🖼️ Storage path:', storagePath);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage.from('thumbnails').upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    console.log('🖼️ Upload result:', { uploadData, uploadError });

    if (uploadError) {
      console.error('🖼️ Upload error:', uploadError);
      return NextResponse.json(
        {
          error: `Upload failed: ${uploadError.message}`,
          details: {
            code: uploadError.code,
            message: uploadError.message,
            details: uploadError.details,
            hint: uploadError.hint,
          },
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(uploadData.path);

    console.log('🖼️ Public URL:', urlData.publicUrl);

    return NextResponse.json({
      success: true,
      path: uploadData.path,
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error('🖼️ API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
