import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type ViewerPhoto = { id: string; url: string; caption: string | null; credit: string | null };

export function PhotoViewer({ photos, index, alt, onClose, onMove }: {
  photos: ViewerPhoto[];
  index: number | null;
  alt: string;
  onClose: () => void;
  onMove: (index: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const open = index !== null && !!photos[index];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const photo = open ? photos[index] : null;
  const step = (delta: number) => { if (index !== null) onMove((index + delta + photos.length) % photos.length); };

  return <dialog
    ref={dialog}
    className="memorial-viewer"
    aria-label="Xem ảnh"
    onClose={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    onKeyDown={(event) => {
      if (photos.length < 2) return;
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
    }}
  >
    {photo && <figure>
      <img src={photo.url} alt={photo.caption || alt} />
      <figcaption>
        <span>{photo.caption}{photo.caption && photo.credit ? " · " : ""}{photo.credit}</span>
        {photos.length > 1 && <span className="memorial-mono">{(index ?? 0) + 1} / {photos.length}</span>}
      </figcaption>
    </figure>}
    <button type="button" className="memorial-viewer-close" aria-label="Đóng" onClick={onClose}><X size={22} aria-hidden="true" /></button>
    {photos.length > 1 && <>
      <button type="button" className="memorial-viewer-prev" aria-label="Ảnh trước" onClick={() => step(-1)}><ChevronLeft size={26} aria-hidden="true" /></button>
      <button type="button" className="memorial-viewer-next" aria-label="Ảnh sau" onClick={() => step(1)}><ChevronRight size={26} aria-hidden="true" /></button>
    </>}
  </dialog>;
}
