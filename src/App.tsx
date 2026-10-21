import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import MemorialHome from "@/pages/MemorialHome";
import MemorialDirectory from "@/pages/MemorialDirectory";
import MemorialArtist from "@/pages/MemorialArtist";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 } },
});

function LegacyArtistRoute() {
  const { slug } = useParams();
  return <Navigate to={`/${slug ?? ""}`} replace />;
}

export default function App() {
  return <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MemorialHome />} />
        <Route path="/danh-sach" element={<MemorialDirectory />} />
        <Route path="/tuong-niem" element={<Navigate to="/" replace />} />
        <Route path="/tuong-niem/danh-sach" element={<Navigate to="/danh-sach" replace />} />
        <Route path="/tuong-niem/:slug" element={<LegacyArtistRoute />} />
        <Route path="/:slug" element={<MemorialArtist />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>;
}
