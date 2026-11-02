import { useEffect, useRef, useState } from "react";
import { Check, Copy, Facebook, Share2 } from "lucide-react";

type CopyState = "idle" | "copied" | "failed";

// Phones get their own share sheet (Zalo, Messenger…); computers get a small menu, since Zalo has no web share link.
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState<CopyState>("idle");
  const wrapper = useRef<HTMLDivElement>(null);
  const firstItem = useRef<HTMLAnchorElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (copy !== "copied") return;
    const timer = window.setTimeout(() => setCopy("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [copy]);

  useEffect(() => {
    if (!open) return;
    firstItem.current?.focus();
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        button.current?.focus();
      } else if (wrapper.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function start() {
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title, url }); } catch { /* Share sheet closed. */ }
      return;
    }
    setCopy("idle");
    setOpen((current) => !current);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopy("copied");
      setOpen(false);
      button.current?.focus();
    } catch {
      setCopy("failed");
    }
  }

  return <div className="memorial-share" ref={wrapper}>
    <button ref={button} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => void start()}>
      {copy === "copied" ? <Check size={17} aria-hidden="true" /> : <Share2 size={17} aria-hidden="true" />}
      {copy === "copied" ? "Đã chép liên kết" : "Chia sẻ"}
    </button>
    {open && <div className="memorial-share-menu" role="menu">
      <a ref={firstItem} role="menuitem" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
        <Facebook size={17} aria-hidden="true" />Chia sẻ lên Facebook
      </a>
      <button role="menuitem" type="button" onClick={() => void copyLink()}>
        <Copy size={17} aria-hidden="true" /><span>Chép liên kết<small>Dán vào Zalo, Messenger hay email</small></span>
      </button>
      {copy === "failed" && <p className="memorial-share-fallback" role="alert">Máy không cho chép tự động. Chép đường dẫn này:<input readOnly value={url} onFocus={(event) => event.target.select()} aria-label="Đường dẫn trang" /></p>}
    </div>}
    <span className="sr-only" role="status">{copy === "copied" ? "Đã chép liên kết" : ""}</span>
  </div>;
}
