'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Image as ImageIcon,
  Upload,
  X,
  Search,
  Filter,
  Film,
  Check,
} from 'lucide-react';
import Image from 'next/image';

interface MediaFile {
  name: string;
  id: string;
  bucket: string;
  size: number;
  created_at: string;
  url: string;
  type: 'image' | 'video';
}

interface MediaPickerProps {
  // Mode
  mode?: 'single' | 'multi';
  
  // Single-select mode props
  currentImageUrl?: string | null;
  onImageSelected?: (url: string) => void;
  
  // Multi-select mode props
  onMultipleSelected?: (files: { url: string; type: 'image' | 'video'; color?: string }[]) => void;
  showColorSelect?: boolean;
  availableColors?: string[];
  
  // Shared props
  accept?: 'images' | 'videos' | 'both';
  maxSizeMB?: number;
  folder?: string;
  bucket?: string;
  
  // UI
  buttonText?: string;
  buttonClassName?: string;
}

export default function MediaPicker({
  mode = 'single',
  currentImageUrl,
  onImageSelected,
  onMultipleSelected,
  showColorSelect = false,
  availableColors = [],
  accept = 'images',
  maxSizeMB = 10,
  folder = '',
  bucket = 'images',
  buttonText,
  buttonClassName,
}: MediaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('library');
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const supabase = createClient();
  const buckets = ['product-images', 'images', 'videos'];

  // Recursively get all files from a folder
  const getAllFilesInFolder = async (targetBucket: string, targetFolder: string = ''): Promise<MediaFile[]> => {
    const allFiles: MediaFile[] = [];

    try {
      const { data, error } = await supabase.storage.from(targetBucket).list(targetFolder, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) {
        console.error(`Error loading ${targetBucket}/${targetFolder}:`, error);
        return allFiles;
      }

      if (!data) return allFiles;

      for (const item of data) {
        const fullPath = targetFolder ? `${targetFolder}/${item.name}` : item.name;

        // If it's a file (has an id), add it
        if (item.id) {
          const { data: urlData } = supabase.storage.from(targetBucket).getPublicUrl(fullPath);
          const isVideo = item.name.toLowerCase().match(/\.(mp4|webm|mov|avi)$/);

          allFiles.push({
            name: fullPath,
            id: item.id,
            bucket: targetBucket,
            size: item.metadata?.size || 0,
            created_at: item.created_at || new Date().toISOString(),
            url: urlData.publicUrl,
            type: isVideo ? 'video' : 'image',
          });
        }
        // If it's a folder (no id), recursively get files from it
        else if (!item.id) {
          const subFiles = await getAllFilesInFolder(targetBucket, fullPath);
          allFiles.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`Error in getAllFilesInFolder ${targetBucket}/${targetFolder}:`, error);
    }

    return allFiles;
  };

  const loadFiles = async () => {
    setLoading(true);
    try {
      const allFiles: MediaFile[] = [];
      const bucketsToLoad = selectedBucket === 'all' ? buckets : [selectedBucket];

      for (const targetBucket of bucketsToLoad) {
        try {
          const bucketFiles = await getAllFilesInFolder(targetBucket);
          allFiles.push(...bucketFiles);
        } catch (bucketError) {
          console.error(`Error processing bucket ${targetBucket}:`, bucketError);
        }
      }

      // Filter by accept type
      let filtered = allFiles;
      if (accept === 'images') {
        filtered = allFiles.filter((f) => f.type === 'image');
      } else if (accept === 'videos') {
        filtered = allFiles.filter((f) => f.type === 'video');
      }

      // Filter by search query
      if (searchQuery) {
        filtered = filtered.filter((f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setFiles(filtered);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, selectedBucket, searchQuery, accept]);

  const handleUpload = async (uploadFiles: FileList | null) => {
    if (!uploadFiles || uploadFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: { url: string; type: 'image' | 'video' }[] = [];

      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];

        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (accept === 'images' && !isImage) continue;
        if (accept === 'videos' && !isVideo) continue;
        if (accept === 'both' && !isImage && !isVideo) continue;

        // Validate file size
        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
          alert(`${file.name} is te groot (max ${maxSizeMB}MB)`);
          continue;
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = folder
          ? `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          : `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(data.path);

        uploadedUrls.push({
          url: publicUrl,
          type: isVideo ? 'video' : 'image',
        });
      }

      // Handle uploaded files based on mode
      if (mode === 'single' && uploadedUrls.length > 0 && onImageSelected) {
        onImageSelected(uploadedUrls[0].url);
        setIsOpen(false);
      } else if (mode === 'multi' && uploadedUrls.length > 0 && onMultipleSelected) {
        const filesWithColor = uploadedUrls.map((f) => ({
          ...f,
          color: selectedColor || undefined,
        }));
        onMultipleSelected(filesWithColor);
        setIsOpen(false);
      }

      // Reload files
      await loadFiles();
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Fout bij uploaden');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectFile = (file: MediaFile) => {
    if (mode === 'single') {
      if (onImageSelected) {
        onImageSelected(file.url);
      }
      setIsOpen(false);
    } else {
      // Multi-select mode: toggle selection
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        newSelected.add(file.id);
      }
      setSelectedFiles(newSelected);
    }
  };

  const handleAddSelected = () => {
    if (mode === 'multi' && onMultipleSelected) {
      const selectedFileObjects = files
        .filter((f) => selectedFiles.has(f.id))
        .map((f) => ({
          url: f.url,
          type: f.type,
          color: selectedColor || undefined,
        }));

      onMultipleSelected(selectedFileObjects);
      setSelectedFiles(new Set());
      setIsOpen(false);
    }
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      {/* Trigger Button */}
      <div className="space-y-3">
        {/* Preview van huidige afbeelding (single mode) */}
        {mode === 'single' && currentImageUrl && (
          <div className="relative w-full aspect-[3/4] max-w-xs border-2 border-black overflow-hidden">
            <Image src={currentImageUrl} alt="Selected" fill className="object-cover" />
          </div>
        )}

        {/* Browse Media Button */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={
            buttonClassName ||
            'px-4 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors border-2 border-black flex items-center gap-2'
          }
        >
          <ImageIcon className="w-5 h-5" />
          {buttonText || (currentImageUrl ? 'Wijzig afbeelding' : 'Selecteer afbeelding')}
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-gray-200">
              <div>
                <h2 className="text-2xl font-bold">Media Selecteren</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {mode === 'single'
                    ? 'Kies een afbeelding uit je media library of upload een nieuwe'
                    : 'Selecteer meerdere bestanden uit je media library'}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b-2 border-gray-200 px-6">
              <button
                onClick={() => setActiveTab('library')}
                className={`px-6 py-3 font-bold uppercase tracking-wide transition-colors border-b-2 -mb-0.5 ${
                  activeTab === 'library'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Media Library
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-3 font-bold uppercase tracking-wide transition-colors border-b-2 -mb-0.5 ${
                  activeTab === 'upload'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'library' ? (
                <>
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    {/* Search */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Zoek bestanden..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>

                    {/* Bucket Filter */}
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                      <select
                        value={selectedBucket}
                        onChange={(e) => setSelectedBucket(e.target.value)}
                        className="pl-10 pr-8 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
                      >
                        <option value="all">Alle buckets</option>
                        {buckets.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Color Select (Multi-select mode) */}
                  {mode === 'multi' && showColorSelect && availableColors.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <label className="block text-sm font-bold mb-2">
                        Koppel aan kleur (optioneel):
                      </label>
                      <select
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="">Algemeen (alle kleuren)</option>
                        {availableColors.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Files Grid */}
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                      <p className="mt-4 text-gray-600">Bestanden laden...</p>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 mb-2">Geen bestanden gevonden</p>
                      <p className="text-sm text-gray-500">
                        {searchQuery ? 'Probeer een andere zoekterm' : 'Upload je eerste bestand'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => handleSelectFile(file)}
                          className={`group relative bg-white rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                            mode === 'multi' && selectedFiles.has(file.id)
                              ? 'border-black ring-2 ring-black'
                              : 'border-gray-200 hover:border-black'
                          }`}
                        >
                          {/* Checkbox (Multi-select) */}
                          {mode === 'multi' && (
                            <div className="absolute top-2 right-2 z-10">
                              <div
                                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                  selectedFiles.has(file.id)
                                    ? 'bg-black border-black'
                                    : 'bg-white border-gray-300 group-hover:border-black'
                                }`}
                              >
                                {selectedFiles.has(file.id) && (
                                  <Check className="w-4 h-4 text-white" />
                                )}
                              </div>
                            </div>
                          )}

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
                          </div>

                          {/* File Info */}
                          <div className="p-2">
                            <p className="text-xs text-gray-900 truncate" title={file.name}>
                              {file.name.split('/').pop()}
                            </p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Upload Tab */
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    dragActive ? 'border-black bg-gray-50' : 'border-gray-300'
                  }`}
                >
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-bold mb-2">
                    {uploading ? 'Uploaden...' : 'Sleep bestanden hierheen'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    of klik op de knop hieronder om bestanden te selecteren
                  </p>

                  <label className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors cursor-pointer">
                    Selecteer bestanden
                    <input
                      type="file"
                      multiple={mode === 'multi'}
                      accept={
                        accept === 'images'
                          ? 'image/*'
                          : accept === 'videos'
                          ? 'video/*'
                          : 'image/*,video/*'
                      }
                      onChange={(e) => handleUpload(e.target.files)}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>

                  <p className="text-sm text-gray-500 mt-4">
                    Max {maxSizeMB}MB per bestand •{' '}
                    {accept === 'images'
                      ? 'Alleen afbeeldingen'
                      : accept === 'videos'
                      ? 'Alleen videos'
                      : 'Afbeeldingen en videos'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer (Multi-select mode) */}
            {mode === 'multi' && activeTab === 'library' && selectedFiles.size > 0 && (
              <div className="border-t-2 border-gray-200 p-6 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {selectedFiles.size} {selectedFiles.size === 1 ? 'bestand' : 'bestanden'}{' '}
                    geselecteerd
                  </p>
                  <button
                    onClick={handleAddSelected}
                    className="px-6 py-3 bg-black text-white font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors"
                  >
                    Toevoegen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

