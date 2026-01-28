import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');

    // Create admin client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (bucket && bucket !== 'all') {
      // List files from specific bucket
      const { data, error } = await supabase.storage.from(bucket).list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) throw error;

      const filesWithUrls = (data || [])
        .filter((file) => file.id)
        .map((file) => {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(file.name);
          const isVideo = file.name.toLowerCase().match(/\.(mp4|webm|mov|avi)$/);

          return {
            name: file.name,
            id: file.id,
            bucket,
            size: file.metadata?.size || 0,
            created_at: file.created_at,
            url: urlData.publicUrl,
            type: isVideo ? 'video' : 'image',
          };
        });

      return NextResponse.json(filesWithUrls);
    } else {
      // List from all buckets
      const buckets = ['product-images', 'images', 'videos'];
      const allFiles = [];

      for (const bucketName of buckets) {
        try {
          const { data, error } = await supabase.storage.from(bucketName).list('', {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' },
          });

          if (error) {
            console.error(`Error listing bucket ${bucketName}:`, error);
            continue;
          }

          const filesWithUrls = (data || [])
            .filter((file) => file.id)
            .map((file) => {
              const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(file.name);
              const isVideo = file.name.toLowerCase().match(/\.(mp4|webm|mov|avi)$/);

              return {
                name: file.name,
                id: file.id,
                bucket: bucketName,
                size: file.metadata?.size || 0,
                created_at: file.created_at,
                url: urlData.publicUrl,
                type: isVideo ? 'video' : 'image',
              };
            });

          allFiles.push(...filesWithUrls);
        } catch (bucketError) {
          console.error(`Error processing bucket ${bucketName}:`, bucketError);
        }
      }

      return NextResponse.json(allFiles);
    }
  } catch (error) {
    console.error('Error in media API:', error);
    return NextResponse.json({ error: 'Failed to load media files' }, { status: 500 });
  }
}

