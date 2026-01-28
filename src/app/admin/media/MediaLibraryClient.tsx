'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Copy, 
  X, 
  Search,
  Filter,
  Download,
  Eye,
  Film
} from 'lucide-react';

interface MediaFile {
  name: string;
  id: string;
  bucket: string;
  size: number;
  created_at: string;
  url: string;
  type: 'image' | 'video';
}

export default function MediaLibraryClient() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const supabase = createClient();
  const buckets = ['product-images', 'images', 'videos'];

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const allFiles: MediaFile[] = [];

      const bucketsToLoad = selectedBucket === 'all' ? buckets : [selectedBucket];

      for (const bucket of bucketsToLoad) {
        const { data, error } = await supabase.storage.from(bucket).list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        });

        if (error) throw error;

        if (data) {
          const filesWithUrls = data
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
              } as MediaFile;
            });

          allFiles.push(...filesWithUrls);
        }
      }

      // Filter op zoekquery
      const filtered = searchQuery
        ? allFiles.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : allFiles;

      setFiles(filtered);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBucket, searchQuery, supabase, buckets]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (uploadFiles: FileList | null, targetBucket?: string) => {
    if (!uploadFiles || uploadFiles.length === 0) return;

    setUploading(true);
    try {
      const bucket = targetBucket || selectedBucket === 'all' ? 'images' : selectedBucket;

      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const fileName = `${Date.now()}-${file.name}`;

        const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

        if (error) throw error;
      }

      await loadFiles();
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Fout bij uploaden');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (file: MediaFile) => {
    if (!confirm(`Weet je zeker dat je "${file.name}" wilt verwijderen?`)) return;

    try {
      const { error } = await supabase.storage.from(file.bucket).remove([file.name]);

      if (error) throw error;

      await loadFiles();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Fout bij verwijderen');
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('URL gekopieerd!');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Media Library</h1>
        <p className="text-gray-600">Beheer alle afbeeldingen en videos van je website</p>
      </div>

      {/* Filters & Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Zoek bestanden..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Bucket Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedBucket}
                onChange={(e) => setSelectedBucket(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
              >
                <option value="all">Alle buckets</option>
                {buckets.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {bucket}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Button */}
          <label className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
            <Upload className="w-5 h-5" />
            <span>{uploading ? 'Uploaden...' : 'Upload bestanden'}</span>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex gap-6 text-sm text-gray-600">
          <span>{files.length} bestanden</span>
          <span>
            {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))} totaal
          </span>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`mb-6 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-black bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-600">
          Sleep bestanden hierheen of klik op "Upload bestanden"
        </p>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">Bestanden laden...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Geen bestanden gevonden</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Preview */}
              <div className="aspect-square bg-gray-100 relative">
                {file.type === 'image' ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => copyUrl(file.url)}
                    className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                    title="Copy URL"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 bg-white rounded-full hover:bg-red-100 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>

              {/* File Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                  {file.name}
                </p>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>{formatFileSize(file.size)}</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    {file.bucket}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg truncate flex-1 mr-4">
                {previewFile.name}
              </h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview */}
            <div className="p-4">
              {previewFile.type === 'image' ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <video
                  src={previewFile.url}
                  controls
                  className="w-full h-auto rounded-lg"
                />
              )}
            </div>

            {/* Details */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-gray-600">Bucket</dt>
                  <dd className="mt-1">{previewFile.bucket}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Grootte</dt>
                  <dd className="mt-1">{formatFileSize(previewFile.size)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Type</dt>
                  <dd className="mt-1">{previewFile.type}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-600">Geüpload</dt>
                  <dd className="mt-1">
                    {new Date(previewFile.created_at).toLocaleDateString('nl-NL')}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-medium text-gray-600 mb-2">URL</dt>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={previewFile.url}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    />
                    <button
                      onClick={() => copyUrl(previewFile.url)}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                </div>
              </dl>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <a
                  href={previewFile.url}
                  download
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <button
                  onClick={() => {
                    handleDelete(previewFile);
                    setPreviewFile(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Verwijder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

