import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface UploadPartitionProps { choirId?: string; onUploadComplete?: () => void; trigger?: React.ReactNode; }

const UploadPartition = ({ choirId, onUploadComplete, trigger }: UploadPartitionProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ title: '', composer: '', description: '', category: 'general' });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') { toast({ title: "Invalid file type", description: "Please select a PDF file", variant: "destructive" }); return; }
      if (selectedFile.size > 10 * 1024 * 1024) { toast({ title: "File too large", description: "Please select a file smaller than 10MB", variant: "destructive" }); return; }
      setFile(selectedFile);
      if (!formData.title) setFormData(prev => ({ ...prev, title: selectedFile.name.replace('.pdf', '') }));
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `${user.id}/${timestamp}-${file.name}`;

      const { error: uploadError } = await supabase.storage.from('partitions').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('partitions')
        .insert({
          title: formData.title,
          composer: formData.composer || null,
          description: formData.description || null,
          category: formData.category,
          file_url: filePath,
          file_name: file.name,
          uploaded_by: user.id,
          choir_id: choirId || null,
        } as any);

      if (dbError) throw dbError;
      toast({ title: "Upload successful", description: `"${formData.title}" has been uploaded` });
      setFile(null);
      setFormData({ title: '', composer: '', description: '', category: 'general' });
      setIsOpen(false);
      onUploadComplete?.();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message || "Failed to upload partition", variant: "destructive" });
    } finally { setIsUploading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger || <Button className="gap-2"><Upload className="h-4 w-4" />Upload Partition</Button>}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Upload New Partition</DialogTitle></DialogHeader>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Select PDF File</CardTitle></CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                <div className="flex flex-col items-center justify-center pt-5 pb-6"><FileText className="w-8 h-8 mb-4 text-muted-foreground" /><p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p><p className="text-xs text-muted-foreground">PDF files only (max 10MB)</p></div>
                <Input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
              </label>
              {file && <div className="flex items-center gap-2 p-2 bg-muted rounded-lg mt-4"><FileText className="h-4 w-4 text-green-500" /><span className="text-sm">{file.name}</span><Button variant="ghost" size="sm" onClick={() => setFile(null)} className="ml-auto h-6 w-6 p-0"><X className="h-3 w-3" /></Button></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Partition Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="title">Title *</Label><Input id="title" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Enter partition title" required /></div>
              <div><Label htmlFor="composer">Composer</Label><Input id="composer" value={formData.composer} onChange={e => setFormData(p => ({ ...p, composer: e.target.value }))} placeholder="Enter composer name" /></div>
              <div><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" rows={2} /></div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!file || !formData.title || isUploading} className="gap-2">
              {isUploading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Uploading...</> : <><Upload className="h-4 w-4" />Upload Partition</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadPartition;
