import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useAdminProfiles, useAdminTributes, useDeleteTribute, useUpdateTribute } from "@/admin/adminData";

type Filter = "all" | "public" | "private";
const dotDate = (value: string | null) => value ? new Date(value).toLocaleDateString("vi-VN") : "";

export default function TributesAdmin() {
  const { data: tributes = [], isLoading } = useAdminTributes();
  const { data: profiles = [] } = useAdminProfiles();
  const updateTribute = useUpdateTribute();
  const deleteTribute = useDeleteTribute();
  const [filter, setFilter] = useState<Filter>("all");
  const names = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const shown = tributes.filter((tribute) => filter === "all" || (filter === "public") === (tribute.is_public !== false));

  return <>
    <div className="admin-page-head"><div><h1>Lời tưởng nhớ</h1><p>200 lời gần nhất. Ẩn thì lời nhắn không còn hiện trên trang nhưng vẫn được giữ lại.</p></div></div>
    <div className="admin-segments" role="group" aria-label="Lọc lời tưởng nhớ">
      {([["all", "Tất cả"], ["public", "Công khai"], ["private", "Đang ẩn hoặc gửi riêng"]] as [Filter, string][]).map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
    </div>
    {isLoading ? <p className="admin-muted">Đang tải…</p> : !shown.length ? <p className="admin-muted">Chưa có lời tưởng nhớ nào.</p> : <ul className="admin-tributes">
      {shown.map((tribute) => {
        const isPublic = tribute.is_public !== false;
        return <li key={tribute.id} className="admin-card" data-public={isPublic}>
          <p className="admin-hint"><strong>{tribute.author_name}</strong> gửi cho <Link to={`/quan-tri/ho-so/${tribute.profile_id}`}>{names.get(tribute.profile_id) ?? "hồ sơ"}</Link> · {dotDate(tribute.created_at)} · {isPublic ? "Công khai" : "Không hiện trên trang"}</p>
          {tribute.prompt && <p className="admin-prompt">{tribute.prompt}</p>}
          <p>{tribute.content}</p>
          <div className="admin-actions">
            <button type="button" className="admin-button admin-button-quiet" disabled={updateTribute.isPending} onClick={() => { if (isPublic || window.confirm("Người gửi có thể đã chọn gửi riêng. Vẫn hiện công khai?")) updateTribute.mutate({ id: tribute.id, is_public: !isPublic }); }}>
              {isPublic ? <><EyeOff size={16} aria-hidden="true" />Ẩn khỏi trang</> : <><Eye size={16} aria-hidden="true" />Hiện công khai</>}
            </button>
            <button type="button" className="admin-button admin-button-danger" disabled={deleteTribute.isPending} onClick={() => { if (window.confirm("Xóa hẳn lời tưởng nhớ này cùng ảnh kèm theo?")) deleteTribute.mutate(tribute.id); }}><Trash2 size={16} aria-hidden="true" />Xóa</button>
          </div>
        </li>;
      })}
    </ul>}
  </>;
}
