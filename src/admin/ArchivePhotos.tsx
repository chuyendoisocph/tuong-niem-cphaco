import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useAddArchivePhoto, useAdminPhotos, useDeletePhoto, useUpdatePhoto } from "@/admin/adminData";

export default function ArchivePhotos({ profileId }: { profileId: string }) {
  const { data: photos = [] } = useAdminPhotos({ profileId });
  const addPhoto = useAddArchivePhoto(profileId);
  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();
  const fileInput = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    setError(null);
    for (const file of Array.from(files ?? [])) {
      try {
        await addPhoto.mutateAsync({ file, caption });
      } catch {
        setError("Có ảnh chưa tải lên được.");
      }
    }
    setCaption("");
  }

  return <section className="admin-card">
    <h2>Album ảnh <small>{photos.length}</small></h2>
    <p className="admin-hint">Ảnh tư liệu hiện ngay trong tab “Hình ảnh”. Ảnh người viếng gửi cần duyệt ở mục Ảnh chờ duyệt.</p>
    <div className="admin-photo-add">
      <input aria-label="Chú thích cho ảnh sắp tải" placeholder="Chú thích (không bắt buộc), ví dụ “Biểu diễn tại Nhà hát Thành phố, 1995”" value={caption} onChange={(event) => setCaption(event.target.value)} />
      <button type="button" className="admin-button admin-button-quiet" disabled={addPhoto.isPending} onClick={() => fileInput.current?.click()}><ImagePlus size={16} aria-hidden="true" />{addPhoto.isPending ? "Đang tải" : "Thêm ảnh"}</button>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(event) => { void add(event.target.files); event.target.value = ""; }} />
    </div>
    {error && <p className="admin-error">{error}</p>}
    {photos.length > 0 && <ul className="admin-photos">{photos.map((photo) => <li key={photo.id}>
      <a href={photo.url} target="_blank" rel="noopener noreferrer"><img src={photo.url} alt={photo.caption ?? ""} loading="lazy" /></a>
      <input aria-label="Chú thích" defaultValue={photo.caption ?? ""} placeholder="Chú thích"
        onBlur={(event) => { const value = event.target.value.trim() || null; if (value !== photo.caption) updatePhoto.mutate({ id: photo.id, changes: { caption: value } }); }} />
      <p className="admin-hint">{photo.comment_id ? `Ảnh của ${photo.author_name ?? "người viếng"}${photo.is_approved ? "" : " · chờ duyệt"}` : "Ảnh tư liệu"}</p>
      <button type="button" className="admin-icon-button" aria-label="Xóa ảnh" onClick={() => { if (window.confirm("Xóa ảnh này?")) deletePhoto.mutate(photo); }}><Trash2 size={16} aria-hidden="true" /></button>
    </li>)}</ul>}
  </section>;
}
