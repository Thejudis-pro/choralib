import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  FileText,
  Loader2,
  Download,
  ExternalLink
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Set up PDF.js worker with local fallback
const setWorkerSrc = () => {
  try {
    // Try CDN first
    const cdnUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    
    // Test if CDN is accessible
    fetch(cdnUrl, { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          pdfjs.GlobalWorkerOptions.workerSrc = cdnUrl;
          console.log('Using CDN worker');
        } else {
          throw new Error('CDN not accessible');
        }
      })
      .catch(() => {
        // Fallback to local worker if available
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          console.log('Using local worker fallback');
        } catch (localError) {
          console.warn('No worker available, using main thread');
          pdfjs.GlobalWorkerOptions.workerSrc = '';
        }
      });
  } catch (error) {
    console.warn('Setting worker source failed:', error);
    pdfjs.GlobalWorkerOptions.workerSrc = '';
  }
};

setWorkerSrc();

interface PDFViewerProps {
  url: string;
  title?: string;
  partitionId?: string;
  onView?: () => void; // Callback for tracking views
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, title = 'PDF Document', partitionId, onView }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (url) {
      loadPDF();
      // Track view if callback provided
      if (onView) {
        onView();
      }
    }
  }, [url, onView]);

  useEffect(() => {
    if (pdf && currentPage) {
      renderPage();
    }
  }, [pdf, currentPage, scale]);

  const loadPDF = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if URL is valid
      if (!url || url.trim() === '') {
        throw new Error('No PDF URL provided');
      }

      console.log('Loading PDF from:', url);
      
      // Check if we have a cached version
      const cachedData = await checkCache(url);
      if (cachedData) {
        console.log('Using cached PDF data');
        setIsCached(true);
        // Load from cache
        const loadingTask = pdfjs.getDocument({ data: cachedData });
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
        return;
      }

      // Load from server
      const loadingTask = pdfjs.getDocument({
        url: url,
        httpHeaders: {
          'Access-Control-Allow-Origin': '*'
        },
        withCredentials: false
      });
      
      const pdfDoc = await loadingTask.promise;
      
      setPdf(pdfDoc);
      setTotalPages(pdfDoc.numPages);
      setCurrentPage(1);
      console.log('PDF loaded successfully:', pdfDoc.numPages, 'pages');
      
      // Cache the PDF data for future use
      await cachePDF(url, pdfDoc);
      
    } catch (err: any) {
      console.error('Error loading PDF:', err);
      let errorMessage = 'Failed to load PDF document';
      
      if (err.name === 'CORS') {
        errorMessage = 'CORS error: PDF cannot be loaded due to cross-origin restrictions';
      } else if (err.name === 'InvalidPDFException') {
        errorMessage = 'Invalid PDF file or corrupted document';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCache = async (url: string): Promise<ArrayBuffer | null> => {
    try {
      const cacheKey = `pdf_cache_${btoa(url)}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Check if cache is still valid (24 hours)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          // Convert base64 back to ArrayBuffer
          const binaryString = atob(data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes.buffer;
        } else {
          // Remove expired cache
          localStorage.removeItem(cacheKey);
        }
      }
      return null;
    } catch (error) {
      console.warn('Cache check failed:', error);
      return null;
    }
  };

  const cachePDF = async (url: string, pdfDoc: any): Promise<void> => {
    try {
      // Get the PDF data as ArrayBuffer
      const pdfData = await pdfDoc.getData();
      const cacheKey = `pdf_cache_${btoa(url)}`;
      
      // Convert ArrayBuffer to base64 for storage
      const bytes = new Uint8Array(pdfData);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      // Store in localStorage with timestamp
      const cacheData = {
        data: base64,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('PDF cached successfully');
    } catch (error) {
      console.warn('Failed to cache PDF:', error);
    }
  };

  const renderPage = async () => {
    if (!pdf || !canvasRef.current) return;

    try {
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Canvas context not available');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Failed to render page');
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const resetZoom = () => {
    setScale(1.2);
  };

  const downloadPDF = () => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = title || 'document.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openExternal = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Loading PDF...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[600px] flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading PDF document...</p>
              {isCached && (
                <p className="text-xs text-green-600 mt-2">Loading from cache</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Viewer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[600px] flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={loadPDF} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                {url && (
                  <>
                    <Button onClick={downloadPDF} variant="outline" className="ml-2">
                      <Download className="h-4 w-4 mr-2" />
                      Download Instead
                    </Button>
                    <Button onClick={openExternal} variant="outline" className="ml-2">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
            {isCached && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Cached
              </span>
            )}
          </CardTitle>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <div className="w-px h-4 bg-border mx-2" />
            
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={resetZoom}>
              {Math.round(scale * 100)}%
            </Button>
            
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-2" />
            
            <Button variant="outline" size="sm" onClick={downloadPDF}>
              <Download className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={openExternal}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[600px] border rounded-lg overflow-auto bg-muted">
          <div className="p-4 flex justify-center">
            <canvas
              ref={canvasRef}
              className="shadow-lg bg-white"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFViewer;