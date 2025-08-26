import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface UploadPartitionProps {
  choirId?: string;
  onUploadComplete?: () => void;
  trigger?: React.ReactNode;
}

const UploadPartition = ({ choirId, onUploadComplete, trigger }: UploadPartitionProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    voice_type: 'all' as const,
    tags: '',
    description: '',
    is_big_library: false
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file",
          variant: "destructive"
        });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: selectedFile.name.replace('.pdf', '') }));
      }
    }
  };

  const generateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Generate file hash for deduplication
      const fileHash = await generateFileHash(file);
      
      // Check if file already exists
      const { data: existingPartition } = await supabase
        .from('partitions')
        .select('id, title')
        .eq('file_hash', fileHash)
        .maybeSingle();

      if (existingPartition) {
        toast({
          title: "File already exists",
          description: `This file already exists as "${existingPartition.title}"`,
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Create unique file path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('partition-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create partition record
      const tagsArray = formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      
      const { data: partition, error: dbError } = await supabase
        .from('partitions')
        .insert({
          title: formData.title,
          composer: formData.composer || null,
          voice_type: formData.voice_type,
          tags: tagsArray.length > 0 ? tagsArray : null,
          file_path: uploadData.path,
          file_hash: fileHash,
          file_size: file.size,
          uploaded_by: user.id,
          choir_id: choirId || null,
          is_big_library: formData.is_big_library
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: "Upload successful",
        description: `"${formData.title}" has been uploaded successfully`
      });

      // Reset form
      setFile(null);
      setFormData({
        title: '',
        composer: '',
        voice_type: 'all',
        tags: '',
        description: '',
        is_big_library: false
      });
      setIsOpen(false);
      onUploadComplete?.();

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload partition",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="default" className="gap-2">
      <Upload className="h-4 w-4" />
      Upload Partition
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload New Partition</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select PDF File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileText className="w-8 h-8 mb-4 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PDF files only (max 10MB)</p>
                    </div>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                
                {file && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="ml-auto h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Partition Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Partition Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter partition title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="composer">Composer</Label>
                <Input
                  id="composer"
                  value={formData.composer}
                  onChange={(e) => setFormData(prev => ({ ...prev, composer: e.target.value }))}
                  placeholder="Enter composer name"
                />
              </div>

              <div>
                <Label htmlFor="voice_type">Voice Type</Label>
                <Select value={formData.voice_type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, voice_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Voices</SelectItem>
                    <SelectItem value="soprano">Soprano</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="tenor">Tenor</SelectItem>
                    <SelectItem value="bass">Bass</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="Enter tags separated by commas"
                />
              </div>

              {!choirId && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_big_library"
                    checked={formData.is_big_library}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_big_library: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_big_library">Add to Big Library (premium feature)</Label>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || !formData.title || isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Partition
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadPartition;