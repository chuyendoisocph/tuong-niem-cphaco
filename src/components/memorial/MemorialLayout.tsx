import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Search } from "lucide-react";
import { initialOf } from "@/lib/memorial";
import { SITE_NAME, SITE_SUBTITLE } from "@/lib/site";
import "@/styles/memorial.css";

export function MemorialHeader() {
  return <header className="memorial-header memorial-shell">
    <Link className="memorial-brand" to="/">
      <img src="/cphaco-logo.png" alt="Logo CPHACO" width="60" height="60" />
      <span className="memorial-brand-text"><span className="memorial-brand-name">{SITE_NAME}</span><span className="memorial-brand-sub">{SITE_SUBTITLE}</span></span>
    </Link>
    <nav className="memorial-header-nav" aria-label="Điều hướng chính">
      <NavLink className="memorial-header-link" to="/tra-cuu"><Search size={15} aria-hidden="true" />Tra cứu</NavLink>
      <NavLink className="memorial-header-link" to="/noi-an-nghi">Nơi an nghỉ</NavLink>
      <NavLink className="memorial-header-link" to="/danh-sach">Danh sách</NavLink>
    </nav>
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
      <span className="memorial-image-fallback">{SITE_NAME}<br />{SITE_SUBTITLE}</span>}
  </div>;
}

