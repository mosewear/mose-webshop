const { createBrowserClient } = require('@supabase/ssr');

const supabase = createBrowserClient(
  'https://bsklcgeyvdsxjxvmghbp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJza2xjZ2V5dmRzeGp4dm1naGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDc5OTMsImV4cCI6MjA4MjY4Mzk5M30.zHxqH_JbQGZ-t9mLz4P8wY-pESQMTGQdLo6qJJf3wZ0',
  {
    auth: {
      persistSession: false,
    },
  }
);

async function testStorage() {
  console.log('\n🔍 Testing Supabase Storage...\n');

  const buckets = ['product-images', 'images', 'videos'];

  for (const bucket of buckets) {
    console.log(`\n📦 Bucket: ${bucket}`);
    
    try {
      const { data, error } = await supabase.storage.from(bucket).list('', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`  ✅ Found ${data.length} files:`);
        data.forEach((file, i) => {
          console.log(`     ${i + 1}. ${file.name} (${(file.metadata?.size || 0) / 1024} KB)`);
        });
      } else {
        console.log(`  ℹ️  No files found`);
      }
    } catch (err) {
      console.log(`  ❌ Exception: ${err.message}`);
    }
  }

  console.log('\n✅ Test complete!\n');
  process.exit(0);
}

testStorage();

