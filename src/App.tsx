import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import PartitionManagement from "./pages/PartitionManagement";
import PartitionDetail from "./pages/PartitionDetail";
import ChoirManagement from "./pages/ChoirManagement";
import Favorites from "./pages/Favorites";
import DownloadHistory from "./pages/DownloadHistory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/partitions" element={<PartitionManagement />} />
            <Route path="/partitions/:choirId" element={<PartitionManagement />} />
            <Route path="/partition/:id" element={<PartitionDetail />} />
            <Route path="/choir-management/:choirId" element={<ChoirManagement />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/downloads" element={<DownloadHistory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
