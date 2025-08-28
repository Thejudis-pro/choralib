import { supabase } from '@/integrations/supabase/client';

export interface PartitionAccess {
  id: string;
  partition_id: string;
  user_id: string;
  accessed_at: string;
  download_count: number;
  last_viewed: string;
}

export interface PartitionStats {
  total_views: number;
  unique_viewers: number;
  total_downloads: number;
  last_accessed: string;
}

export class PartitionService {
  private static instance: PartitionService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): PartitionService {
    if (!PartitionService.instance) {
      PartitionService.instance = new PartitionService();
    }
    return PartitionService.instance;
  }

  /**
   * Track when a user views a partition
   */
  async trackPartitionView(partitionId: string, userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Check if access record exists
      const { data: existingAccess } = await supabase
        .from('partition_access')
        .select('*')
        .eq('partition_id', partitionId)
        .eq('user_id', userId)
        .single();

      if (existingAccess) {
        // Update existing access record
        await supabase
          .from('partition_access')
          .update({
            accessed_at: now,
            last_viewed: now
          })
          .eq('id', existingAccess.id);
      } else {
        // Create new access record
        await supabase
          .from('partition_access')
          .insert({
            partition_id: partitionId,
            user_id: userId,
            accessed_at: now,
            last_viewed: now,
            download_count: 0
          });
      }
    } catch (error) {
      console.error('Failed to track partition view:', error);
    }
  }

  /**
   * Track when a user downloads a partition
   */
  async trackPartitionDownload(partitionId: string, userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Check if access record exists
      const { data: existingAccess } = await supabase
        .from('partition_access')
        .select('*')
        .eq('partition_id', partitionId)
        .eq('user_id', userId)
        .single();

      if (existingAccess) {
        // Update existing access record
        await supabase
          .from('partition_access')
          .update({
            accessed_at: now,
            last_viewed: now,
            download_count: existingAccess.download_count + 1
          })
          .eq('id', existingAccess.id);
      } else {
        // Create new access record
        await supabase
          .from('partition_access')
          .insert({
            partition_id: partitionId,
            user_id: userId,
            accessed_at: now,
            last_viewed: now,
            download_count: 1
          });
      }
    } catch (error) {
      console.error('Failed to track partition download:', error);
    }
  }

  /**
   * Get partition statistics for admins
   */
  async getPartitionStats(partitionId: string): Promise<PartitionStats> {
    try {
      const { data: accessRecords, error } = await supabase
        .from('partition_access')
        .select('*')
        .eq('partition_id', partitionId);

      if (error) throw error;

      const stats: PartitionStats = {
        total_views: accessRecords?.length || 0,
        unique_viewers: accessRecords?.length || 0,
        total_downloads: accessRecords?.reduce((sum, record) => sum + (record.download_count || 0), 0) || 0,
        last_accessed: accessRecords?.length > 0 
          ? accessRecords.reduce((latest, record) => 
              record.accessed_at > latest ? record.accessed_at : latest, 
              accessRecords[0].accessed_at
            )
          : 'Never'
      };

      return stats;
    } catch (error) {
      console.error('Failed to get partition stats:', error);
      return {
        total_views: 0,
        unique_viewers: 0,
        total_downloads: 0,
        last_accessed: 'Never'
      };
    }
  }

  /**
   * Get user's partition access history
   */
  async getUserPartitionHistory(userId: string): Promise<PartitionAccess[]> {
    try {
      const { data, error } = await supabase
        .from('partition_access')
        .select(`
          *,
          partitions (
            id,
            title,
            composer,
            file_url
          )
        `)
        .eq('user_id', userId)
        .order('last_viewed', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get user partition history:', error);
      return [];
    }
  }

  /**
   * Cache partition data locally
   */
  cachePartitionData(partitionId: string, data: any): void {
    this.cache.set(partitionId, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached partition data
   */
  getCachedPartitionData(partitionId: string): any | null {
    const cached = this.cache.get(partitionId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    // Remove expired cache
    this.cache.delete(partitionId);
    return null;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get partition access analytics for admin dashboard
   */
  async getPartitionAnalytics(choirId: string): Promise<{
    totalPartitions: number;
    totalViews: number;
    totalDownloads: number;
    mostViewedPartitions: Array<{
      id: string;
      title: string;
      views: number;
      downloads: number;
    }>;
  }> {
    try {
      // Get all partitions for the choir
      const { data: partitions, error: partitionsError } = await supabase
        .from('partitions')
        .select('id, title')
        .eq('choir_id', choirId);

      if (partitionsError) throw partitionsError;

      const totalPartitions = partitions?.length || 0;
      let totalViews = 0;
      let totalDownloads = 0;
      const partitionStats: Array<{
        id: string;
        title: string;
        views: number;
        downloads: number;
      }> = [];

      // Get stats for each partition
      for (const partition of partitions || []) {
        const stats = await this.getPartitionStats(partition.id);
        totalViews += stats.total_views;
        totalDownloads += stats.total_downloads;
        
        partitionStats.push({
          id: partition.id,
          title: partition.title,
          views: stats.total_views,
          downloads: stats.total_downloads
        });
      }

      // Sort by views (most viewed first)
      partitionStats.sort((a, b) => b.views - a.views);

      return {
        totalPartitions,
        totalViews,
        totalDownloads,
        mostViewedPartitions: partitionStats.slice(0, 5) // Top 5
      };
    } catch (error) {
      console.error('Failed to get partition analytics:', error);
      return {
        totalPartitions: 0,
        totalViews: 0,
        totalDownloads: 0,
        mostViewedPartitions: []
      };
    }
  }
}

export const partitionService = PartitionService.getInstance();
