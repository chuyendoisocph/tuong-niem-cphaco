import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { initialOf } from "@/lib/memorial";
import "@/styles/memorial.css";

export function MemorialHeader() {
  return <header className="memorial-header memorial-shell">
    <Link className="memorial-brand" to="/">
      <img src="/cphaco-logo.png" alt="Logo CPHACO" width="60" height="60" />
      <span>Nhịp cầu tri ân</span>
    </Link>
    <Link className="memorial-header-link" to="/danh-sach">Tất cả nghệ sĩ</Link>
  </header>;
}

export function MemorialFooter({ children }: { children?: ReactNode }) {
  return <footer className="memorial-footer memorial-shell">
    {children}
    <div className="memorial-footer-rule" />
    <p>CPHACO, Hoa Viên Bình Dương</p>
  </footer>;
}

export function MemorialPage({ children }: { children: ReactNode }) {
  return <div className="memorial"><MemorialHeader />{children}<MemorialFooter /></div>;
}

export function MemorialPortrait({ src, name, className = "", loading = "lazy" }: {
  src: string | null | undefined;
  name: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);
  return <div className={`memorial-portrait ${className}`}>
    {src && !failed
      ? <img src={src} alt={`Chân dung ${name}`} loading={loading} onError={() => setFailed(true)} />
      : <span className="memorial-monogram" aria-label={name}>{initialOf(name)}</span>}
  </div>;
}

export function MemorialImage({ src, alt, className = "", position }: {
  src: string | undefined;
  alt: string;
  className?: string;
  position?: string;
}) {
  return <div className={`memorial-place-image ${className}`}>
    {src ? <img src={src} alt={alt} style={position ? { objectPosition: position } : undefined} /> :
      <span className="memorial-image-fallback">Đường Nghệ sĩ<br />Hoa Viên Bình Dương</span>}
  </div>;
}

