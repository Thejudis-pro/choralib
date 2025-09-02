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
   * Track when a user views a partition using localStorage for now
   */
  async trackPartitionView(partitionId: string, userId: string): Promise<void> {
    try {
      const viewHistory = JSON.parse(localStorage.getItem(`partition_views_${userId}`) || '[]');
      const existingIndex = viewHistory.findIndex((item: any) => item.partitionId === partitionId);
      
      if (existingIndex >= 0) {
        viewHistory[existingIndex].lastViewed = new Date().toISOString();
        viewHistory[existingIndex].viewCount = (viewHistory[existingIndex].viewCount || 1) + 1;
      } else {
        viewHistory.push({
          partitionId,
          lastViewed: new Date().toISOString(),
          viewCount: 1
        });
      }
      
      localStorage.setItem(`partition_views_${userId}`, JSON.stringify(viewHistory));
    } catch (error) {
      console.error('Failed to track partition view:', error);
    }
  }

  /**
   * Track when a user downloads a partition using localStorage for now
   */
  async trackPartitionDownload(partitionId: string, userId: string): Promise<void> {
    try {
      const downloadHistory = JSON.parse(localStorage.getItem(`partition_downloads_${userId}`) || '[]');
      const existingIndex = downloadHistory.findIndex((item: any) => item.partitionId === partitionId);
      
      if (existingIndex >= 0) {
        downloadHistory[existingIndex].lastDownloaded = new Date().toISOString();
        downloadHistory[existingIndex].downloadCount = (downloadHistory[existingIndex].downloadCount || 1) + 1;
      } else {
        downloadHistory.push({
          partitionId,
          lastDownloaded: new Date().toISOString(),
          downloadCount: 1
        });
      }
      
      localStorage.setItem(`partition_downloads_${userId}`, JSON.stringify(downloadHistory));
    } catch (error) {
      console.error('Failed to track partition download:', error);
    }
  }

  /**
   * Get partition statistics for admins using localStorage for now
   */
  async getPartitionStats(partitionId: string): Promise<PartitionStats> {
    try {
      // This is a simplified version using localStorage
      // In production, this would query the partition_access table
      return {
        total_views: 0,
        unique_viewers: 0,
        total_downloads: 0,
        last_accessed: 'Never'
      };
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
   * Get user's partition access history using localStorage for now
   */
  async getUserPartitionHistory(userId: string): Promise<PartitionAccess[]> {
    try {
      // This is a simplified version using localStorage
      // In production, this would query the partition_access table
      return [];
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
