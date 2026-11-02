import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { ExternalLink, Search } from "lucide-react";
import { ART_FORMS, initialOf } from "@/lib/memorial";
import { GRAVE_MAP_URL, SITE_DESCRIPTION, SITE_NAME, SITE_SUBTITLE, VISIT_INFO } from "@/lib/site";
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
  const visitLines = [VISIT_INFO.address, VISIT_INFO.phone, VISIT_INFO.hours].filter((line) => line.trim());
  return <footer className="memorial-footer">
    <div className="memorial-shell">
      {children}
      <div className="memorial-footer-grid">
        <div className="memorial-footer-about">
          <Link className="memorial-brand" to="/">
            <img src="/cphaco-logo.png" alt="" width="60" height="60" />
            <span className="memorial-brand-text"><span className="memorial-brand-name">{SITE_NAME}</span><span className="memorial-brand-sub">{SITE_SUBTITLE}</span></span>
          </Link>
          <p>{SITE_DESCRIPTION}</p>
        </div>
        <nav aria-labelledby="footer-browse">
          <h2 id="footer-browse">Tìm hiểu</h2>
          <ul>
            <li><Link to="/tra-cuu">Tra cứu</Link></li>
            <li><Link to="/danh-sach">Danh sách</Link></li>
            <li><Link to="/noi-an-nghi">Nơi an nghỉ</Link></li>
          </ul>
        </nav>
        <nav aria-labelledby="footer-forms">
          <h2 id="footer-forms">Lĩnh vực</h2>
          <ul>{ART_FORMS.map((form) => <li key={form}><Link to={`/tra-cuu?linhvuc=${encodeURIComponent(form)}`}>{form}</Link></li>)}</ul>
        </nav>
        <div>
          <h2>Đến viếng</h2>
          <ul>
            <li><a href={GRAVE_MAP_URL} target="_blank" rel="noopener noreferrer">Bản đồ số<ExternalLink size={14} aria-hidden="true" /></a></li>
            {visitLines.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      </div>
      <p className="memorial-footer-legal">© {new Date().getFullYear()} CPHACO, Hoa Viên Bình Dương</p>
    </div>
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

