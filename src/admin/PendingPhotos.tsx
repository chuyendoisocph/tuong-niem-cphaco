import { Link } from "react-router-dom";
import { Check, Trash2 } from "lucide-react";
import { useAdminPhotos, useAdminProfiles, useAdminTributes, useDeletePhoto, useUpdatePhoto } from "@/admin/adminData";
import { innerQuotes } from "@/lib/memorial";

const dotDate = (value: string | null) => value ? new Date(value).toLocaleDateString("vi-VN") : "";

export default function PendingPhotos() {
  const { data: photos = [], isLoading } = useAdminPhotos({ pending: true });
  const { data: profiles = [] } = useAdminProfiles();
  const { data: tributes = [] } = useAdminTributes([...new Set(photos.map((photo) => photo.comment_id).filter((id): id is string => !!id))]);
  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();
  const names = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const memories = new Map(tributes.map((tribute) => [tribute.id, tribute]));

  return <>
    <div className="admin-page-head"><div><h1>Ảnh chờ duyệt</h1><p>Ảnh người viếng gửi kèm lời tưởng nhớ. Duyệt thì ảnh hiện trong album và dưới lời nhắn; từ chối thì ảnh bị xóa hẳn.</p></div></div>
    {isLoading ? <p className="admin-muted">Đang tải…</p> : !photos.length ? <p className="admin-muted">Không có ảnh nào đang chờ.</p> : <ul className="admin-review">
      {photos.map((photo) => {
        const memory = photo.comment_id ? memories.get(photo.comment_id) : undefined;
        return <li key={photo.id} className="admin-card">
          <a href={photo.url} target="_blank" rel="noopener noreferrer"><img src={photo.url} alt={`Ảnh của ${photo.author_name ?? "người viếng"}`} /></a>
          <div>
            <p><strong>{photo.author_name ?? "Người viếng"}</strong> gửi cho <Link to={`/quan-tri/ho-so/${photo.profile_id}`}>{names.get(photo.profile_id) ?? "hồ sơ"}</Link> · {dotDate(photo.created_at)}</p>
            {memory && <blockquote>{memory.prompt && <small>{memory.prompt}</small>}“{innerQuotes(memory.content)}”{memory.is_public === false && <small>Lời nhắn này gửi riêng, không công khai.</small>}</blockquote>}
            <div className="admin-actions">
              <button type="button" className="admin-button" disabled={updatePhoto.isPending} onClick={() => updatePhoto.mutate({ id: photo.id, changes: { is_approved: true } })}><Check size={16} aria-hidden="true" />Duyệt</button>
              <button type="button" className="admin-button admin-button-danger" disabled={deletePhoto.isPending} onClick={() => { if (window.confirm("Từ chối và xóa ảnh này?")) deletePhoto.mutate(photo); }}><Trash2 size={16} aria-hidden="true" />Từ chối</button>
            </div>
          </div>
        </li>;
      })}
    </ul>}
  </>;
}
