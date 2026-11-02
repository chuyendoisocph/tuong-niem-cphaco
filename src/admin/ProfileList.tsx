import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useAdminProfiles, type AdminProfile } from "@/admin/adminData";
import { hiddenReason } from "@/hooks/usePublicMemorial";
import { foldVietnamese, formatLifespan, initialOf } from "@/lib/memorial";

type Filter = "all" | "shown" | "hidden" | "hoa-vien" | "elsewhere";
const FILTERS: { id: Filter; label: string; test: (profile: AdminProfile) => boolean }[] = [
  { id: "all", label: "Tất cả", test: () => true },
  { id: "shown", label: "Đang hiện", test: (profile) => !hiddenReason(profile) },
  { id: "hidden", label: "Đang ẩn", test: (profile) => !!hiddenReason(profile) },
  { id: "hoa-vien", label: "Tại Hoa Viên", test: (profile) => profile.in_hoa_vien },
  { id: "elsewhere", label: "Nơi khác", test: (profile) => !profile.in_hoa_vien },
];

export default function ProfileList() {
  const { data: profiles = [], isLoading, error } = useAdminProfiles();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const query = foldVietnamese(search.trim());
  const test = FILTERS.find((option) => option.id === filter)?.test ?? (() => true);
  const shown = profiles.filter((profile) => test(profile) && (!query || foldVietnamese(`${profile.name} ${profile.grave_number ?? ""}`).includes(query)));

  return <>
    <div className="admin-page-head">
      <div><h1>Hồ sơ</h1><p>{profiles.length} hồ sơ · {profiles.filter((profile) => !hiddenReason(profile)).length} đang hiện trên trang</p></div>
      <Link className="admin-button" to="/quan-tri/ho-so/moi"><Plus size={17} aria-hidden="true" />Thêm hồ sơ</Link>
    </div>
    <div className="admin-toolbar">
      <label className="admin-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Tìm hồ sơ" placeholder="Tìm theo tên hoặc vị trí" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <div className="admin-segments" role="group" aria-label="Lọc hồ sơ">
        {FILTERS.map((option) => <button key={option.id} type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>{option.label} <small>{profiles.filter(option.test).length}</small></button>)}
      </div>
    </div>
    {error ? <p className="admin-error">Không tải được danh sách hồ sơ.</p> : isLoading ? <p className="admin-muted">Đang tải…</p> : <table className="admin-table">
      <thead><tr><th scope="col">Họ tên</th><th scope="col">Năm</th><th scope="col">Nơi an nghỉ</th><th scope="col">Trên trang</th></tr></thead>
      <tbody>{shown.map((profile) => {
        const reason = hiddenReason(profile);
        return <tr key={profile.id}>
          <td><Link to={`/quan-tri/ho-so/${profile.id}`} className="admin-person">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" loading="lazy" /> : <span aria-hidden="true">{initialOf(profile.name)}</span>}
            <strong>{profile.name}</strong>
          </Link></td>
          <td>{formatLifespan(profile.birth_date, profile.death_date)}</td>
          <td>{profile.in_hoa_vien ? `Hoa Viên${profile.grave_number ? " · " + profile.grave_number : " · chưa có vị trí"}` : profile.resting_place ?? "Chưa rõ"}</td>
          <td>{reason ? <span className="admin-status is-hidden">{reason}</span> : <span className="admin-status is-shown">Đang hiện</span>}</td>
        </tr>;
      })}</tbody>
    </table>}
    {!isLoading && !shown.length && <p className="admin-muted">Không có hồ sơ nào khớp.</p>}
  </>;
}
