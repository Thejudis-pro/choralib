import { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  Heart, 
  HeartOff, 
  FileText, 
  Music, 
  User, 
  Calendar,
  HardDrive,
  Tag
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Partition {
  id: string;
  title: string;
  composer: string | null;
  voice_type: string;
  tags: string[] | null;
  file_path: string;
  file_size: number | null;
  created_at: string;
  uploaded_by: string;
  choir_id: string | null;
  is_big_library: boolean;
  uploader_name?: string;
  choir_name?: string;
}

const PartitionDetail = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const [partition, setPartition] = useState<Partition | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchPartition();
      checkFavoriteStatus();
      checkDownloadStatus();
    }
  }, [user, id]);

  useEffect(() => {
    if (partition && hasDownloaded && !previewUrl) {
      generatePreviewUrl();
    }
  }, [partition, hasDownloaded, previewUrl]);

  const fetchPartition = async () => {
    if (!id) return;

    try {
      // Fetch partition with uploader and choir info
      const { data, error } = await supabase
        .from('partitions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setPartition(null);
        setIsLoading(false);
        return;
      }

      // Fetch uploader info separately
      let uploaderName = 'Unknown';
      if (data.uploaded_by) {
        const { data: uploaderData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', data.uploaded_by)
          .single();
        uploaderName = uploaderData?.full_name || 'Unknown';
      }

      // Fetch choir info separately
      let choirName = null;
      if (data.choir_id) {
        const { data: choirData } = await supabase
          .from('choirs')
          .select('name')
          .eq('id', data.choir_id)
          .single();
        choirName = choirData?.name || null;
      }

      const partitionData: Partition = {
        ...data,
        uploader_name: uploaderName,
        choir_name: choirName
      };

      setPartition(partitionData);

    } catch (error: any) {
      console.error('Error fetching partition:', error);
      toast({
        title: "Error",
        description: "Failed to load partition details",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('partition_id', id)
        .maybeSingle();

      if (!error) {
        setIsFavorited(!!data);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const checkDownloadStatus = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('downloads')
        .select('id')
        .eq('user_id', user.id)
        .eq('partition_id', id)
        .maybeSingle();

      if (!error) {
        setHasDownloaded(!!data);
      }
    } catch (error) {
      console.error('Error checking download status:', error);
    }
  };

  const generatePreviewUrl = async () => {
    if (!partition) return;
    
    try {
      console.log('Generating preview URL for file path:', partition.file_path);
      const { data: urlData, error: urlError } = await supabase.storage
        .from('partition-files')
        .createSignedUrl(partition.file_path, 3600); // 1 hour expiry

      console.log('URL generation result:', { urlData, urlError });
      if (!urlError && urlData) {
        setPreviewUrl(urlData.signedUrl);
        console.log('Preview URL set:', urlData.signedUrl);
      } else {
        console.error('URL generation failed:', urlError);
      }
    } catch (urlError) {
      console.error('Failed to generate preview URL:', urlError);
    }
  };

  const toggleFavorite = async () => {
    if (!user || !partition) return;

    try {
      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('partition_id', partition.id);
        
        setIsFavorited(false);
        toast({
          title: "Removed from favorites",
          description: `"${partition.title}" removed from your favorites`
        });
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, partition_id: partition.id });
        
        setIsFavorited(true);
        toast({
          title: "Added to favorites",
          description: `"${partition.title}" added to your favorites`
        });
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive"
      });
    }
  };

  const unlockPartition = async () => {
    if (!partition || !user) return;

    try {
      setIsUnlocking(true);

      // Record the download/unlock in the database
      const { error } = await supabase
        .from('downloads')
        .insert({
          user_id: user.id,
          partition_id: partition.id
        });

      if (error) throw error;

      setHasDownloaded(true);

      // Generate preview URL after unlocking
      await generatePreviewUrl();

      toast({
        title: "Partition unlocked",
        description: `"${partition.title}" is now available for viewing`
      });

    } catch (error: any) {
      console.error('Unlock error:', error);
      toast({
        title: "Unlock failed",
        description: error.message || "Failed to unlock partition",
        variant: "destructive"
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!partition) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Partition not found</h3>
            <p className="text-muted-foreground mb-4">
              The partition you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link to="/dashboard">
              <Button variant="default">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{partition.title}</h1>
            {partition.composer && (
              <p className="text-xl text-muted-foreground mt-1">by {partition.composer}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* PDF Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Partition Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasDownloaded && previewUrl ? (
                  <div className="w-full h-[600px] border rounded-lg overflow-hidden">
                    <iframe
                      src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full"
                      title={`Preview of ${partition.title}`}
                    />
                  </div>
                ) : (
                  <div className="w-full h-[600px] border rounded-lg flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">
                        {hasDownloaded ? 'Loading preview...' : 'Unlock this partition to view it'}
                      </p>
                      {!hasDownloaded && (
                        <Button 
                          onClick={unlockPartition}
                          disabled={isUnlocking}
                          className="mt-4 gap-2"
                        >
                          <Download className="h-4 w-4" />
                          {isUnlocking ? 'Unlocking...' : 'Unlock to View'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Partition Details */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!hasDownloaded ? (
                  <Button 
                    onClick={unlockPartition}
                    disabled={isUnlocking}
                    className="w-full gap-2"
                    variant="default"
                  >
                    <Download className="h-4 w-4" />
                    {isUnlocking ? 'Unlocking...' : 'Unlock to View'}
                  </Button>
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    Partition unlocked - view above
                  </div>
                )}
                
                <Button 
                  onClick={toggleFavorite}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {isFavorited ? (
                    <>
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      Remove from Favorites
                    </>
                  ) : (
                    <>
                      <HeartOff className="h-4 w-4" />
                      Add to Favorites
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Partition Info */}
            <Card>
              <CardHeader>
                <CardTitle>Partition Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Music className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Voice Type</p>
                    <Badge variant="secondary">{partition.voice_type}</Badge>
                  </div>
                </div>

                {partition.tags && partition.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {partition.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Uploaded by</p>
                    <p className="font-medium">{partition.uploader_name}</p>
                  </div>
                </div>

                {partition.choir_name && (
                  <div className="flex items-center gap-3">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Choir</p>
                      <p className="font-medium">{partition.choir_name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Upload Date</p>
                    <p className="font-medium">
                      {new Date(partition.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {partition.file_size && (
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">File Size</p>
                      <p className="font-medium">
                        {(partition.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}

                {partition.is_big_library && (
                  <div className="pt-2">
                    <Badge variant="default" className="w-full justify-center">
                      Big Library
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartitionDetail;