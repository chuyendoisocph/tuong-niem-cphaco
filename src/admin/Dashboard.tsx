import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarHeart, Flower2, ImageIcon, MessageSquareHeart } from "lucide-react";
import { useAdminPhotos, useAdminProfiles, useAdminTributes, useFlowerCounts, useItemCounts, type AdminProfile } from "@/admin/adminData";
import { GAPS, areaOf, gapLabel, gapsOf, type Gap } from "@/admin/completeness";
import QuickEdit from "@/admin/QuickEdit";
import { hiddenReason } from "@/hooks/usePublicMemorial";
import { formatLifespan, initialOf, nextAnniversary, parseName } from "@/lib/memorial";

type Scope = "hoa-vien" | "all";
const WEEK = 7;
const dayMonth = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`;

function Tile({ profile, gaps, onOpen }: { profile: AdminProfile; gaps: Gap[]; onOpen: () => void }) {
  const hidden = hiddenReason(profile);
  const { shortName, profession, honorific } = parseName(profile.name);
  return <button type="button" className="dash-tile" data-hidden={!!hidden} onClick={onOpen}
    aria-label={`${profile.name}${hidden ? `, đang ẩn: ${hidden}` : ""}${gaps.length ? `, ${gaps.map(gapLabel).join(", ").toLowerCase()}` : ", đủ thông tin"}`}>
    {profile.avatar_url ? <img src={profile.avatar_url} alt="" loading="lazy" /> : <span className="dash-tile-initial" aria-hidden="true">{initialOf(profile.name)}</span>}
    <span className="dash-tile-text">
      <strong>{shortName}</strong>
      <small>{[honorific, profession].filter(Boolean).join(" ") || "—"} · {formatLifespan(profile.birth_date, profile.death_date)}</small>
      <span className="dash-tile-state">
        {hidden && <em className="is-hidden">Đang ẩn</em>}
        {gaps.length ? <em className="is-gap" title={gaps.map(gapLabel).join(", ")}>Thiếu {gaps.length}</em> : <em className="is-ok">Đủ</em>}
      </span>
    </span>
  </button>;
}

export default function Dashboard() {
  const { data: profiles = [], isLoading } = useAdminProfiles();
  const { data: counts = new Map() } = useItemCounts();
  const { data: flowers = new Map<string, number>() } = useFlowerCounts();
  const { data: pendingPhotos = [] } = useAdminPhotos({ pending: true });
  const { data: tributes = [] } = useAdminTributes();
  const [scope, setScope] = useState<Scope>("hoa-vien");
  const [gapFilter, setGapFilter] = useState<Gap | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);

  const inScope = profiles.filter((profile) => scope === "all" || profile.in_hoa_vien);
  const gapsById = useMemo(() => new Map(profiles.map((profile) => [profile.id, gapsOf(profile, counts.get(profile.id))])), [profiles, counts]);
  const visible = inScope.filter((profile) => !hiddenReason(profile));
  const anniversaries = visible
    .map((profile) => ({ profile, anniversary: nextAnniversary(profile.death_date, today) }))
    .filter((entry): entry is { profile: AdminProfile; anniversary: NonNullable<typeof entry.anniversary> } => !!entry.anniversary && entry.anniversary.daysUntil <= WEEK)
    .sort((left, right) => left.anniversary.daysUntil - right.anniversary.daysUntil);
  const weekAgo = today.getTime() - WEEK * 86_400_000;
  const recentTributes = tributes.filter((tribute) => tribute.created_at && new Date(tribute.created_at).getTime() >= weekAgo);
  const names = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const flowerTotal = [...flowers.values()].reduce((sum, value) => sum + value, 0);
  const topFlowers = [...flowers.entries()].filter(([id]) => names.has(id)).sort((left, right) => right[1] - left[1]).slice(0, 3);

  // Sections build themselves from the data: one per area, biggest first, unplaced people last.
  const sections = useMemo(() => {
    const groups = new Map<string, AdminProfile[]>();
    for (const profile of inScope) {
      if (gapFilter && !gapsById.get(profile.id)?.includes(gapFilter)) continue;
      const area = areaOf(profile);
      groups.set(area, [...(groups.get(area) ?? []), profile]);
    }
    const unplaced = (area: string) => Number(area.includes("chưa"));
    return [...groups.entries()]
      .map(([area, members]) => ({ area, members: members.sort((left, right) => parseName(left.name).shortName.localeCompare(parseName(right.name).shortName, "vi")) }))
      .sort((left, right) => unplaced(left.area) - unplaced(right.area) || right.members.length - left.members.length || left.area.localeCompare(right.area, "vi", { numeric: true }));
  }, [inScope, gapFilter, gapsById]);

  const gapCount = (gap: Gap) => inScope.filter((profile) => gapsById.get(profile.id)?.includes(gap)).length;
  const complete = inScope.filter((profile) => !gapsById.get(profile.id)?.length).length;
  const openProfile = profiles.find((profile) => profile.id === openId) ?? null;

  if (isLoading) return <p className="admin-muted">Đang tải…</p>;

  return <>
    <div className="admin-page-head">
      <div>
        <h1>Tổng quan</h1>
        <p>{today.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })} · {visible.length} người đang hiện trên trang · {complete}/{inScope.length} hồ sơ đủ thông tin</p>
      </div>
      <div className="admin-segments" role="group" aria-label="Phạm vi">
        <button type="button" aria-pressed={scope === "hoa-vien"} onClick={() => setScope("hoa-vien")}>Tại Hoa Viên</button>
        <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>Tất cả hồ sơ</button>
      </div>
    </div>

    <div className="dash-badges" aria-label="Cần chú ý">
      {pendingPhotos.length > 0 && <Link className="dash-badge is-alert" to="/quan-tri/anh-cho-duyet"><ImageIcon size={16} aria-hidden="true" /><b>{pendingPhotos.length}</b> ảnh chờ duyệt</Link>}
      {anniversaries.length > 0 && <a className="dash-badge is-alert" href="#ngay-gio"><CalendarHeart size={16} aria-hidden="true" /><b>{anniversaries.length}</b> ngày giỗ trong 7 ngày</a>}
      <Link className="dash-badge" to="/quan-tri/loi-tuong-nho"><MessageSquareHeart size={16} aria-hidden="true" /><b>{recentTributes.length}</b> lời tưởng nhớ tuần này</Link>
      <span className="dash-badge"><Flower2 size={16} aria-hidden="true" /><b>{flowerTotal.toLocaleString("vi-VN")}</b> đóa hoa đã dâng</span>
    </div>

    <div className="dash-cards">
      {anniversaries.length > 0 && <section id="ngay-gio" className="admin-card dash-card">
        <h2>Ngày giỗ sắp tới</h2>
        <ul className="dash-list">{anniversaries.map(({ profile, anniversary }) => <li key={profile.id} data-today={anniversary.isToday}>
          <span className="dash-date">{anniversary.isToday ? "Hôm nay" : dayMonth(anniversary.date)}</span>
          <button type="button" className="dash-name" onClick={() => setOpenId(profile.id)}>{profile.name}</button>
          <small>{anniversary.years} năm{anniversary.daysUntil > 0 ? ` · còn ${anniversary.daysUntil} ngày` : ""}</small>
        </li>)}</ul>
        <p className="admin-hint">Trang chủ tự đưa người có ngày giỗ gần nhất lên đầu trong tuần giỗ.</p>
      </section>}

      {pendingPhotos.length > 0 && <section className="admin-card dash-card">
        <h2>Ảnh chờ duyệt</h2>
        <div className="dash-thumbs">{pendingPhotos.slice(0, 6).map((photo) => <img key={photo.id} src={photo.url} alt={`Ảnh của ${photo.author_name ?? "người viếng"}`} loading="lazy" />)}</div>
        <Link className="admin-button admin-button-small" to="/quan-tri/anh-cho-duyet">Duyệt {pendingPhotos.length} ảnh</Link>
      </section>}

      {recentTributes.length > 0 && <section className="admin-card dash-card">
        <h2>Lời tưởng nhớ mới</h2>
        <ul className="dash-list">{recentTributes.slice(0, 3).map((tribute) => <li key={tribute.id} className="dash-quote">
          <p>“{tribute.content.length > 110 ? tribute.content.slice(0, 110) + "…" : tribute.content}”</p>
          <small>{tribute.author_name} gửi {names.get(tribute.profile_id) ?? ""}</small>
        </li>)}</ul>
        <Link className="admin-link" to="/quan-tri/loi-tuong-nho">Xem tất cả</Link>
      </section>}

      {topFlowers.length > 0 && <section className="admin-card dash-card">
        <h2>Được dâng hoa nhiều nhất</h2>
        <ol className="dash-list dash-ranking">{topFlowers.map(([id, total]) => <li key={id}>
          <button type="button" className="dash-name" onClick={() => setOpenId(id)}>{names.get(id)}</button>
          <small>{total.toLocaleString("vi-VN")} đóa</small>
        </li>)}</ol>
      </section>}

      <section className="admin-card dash-card">
        <h2>Dữ liệu còn thiếu</h2>
        <ul className="dash-gaps">{GAPS.map((gap) => {
          const count = gapCount(gap.id);
          return <li key={gap.id}>
            <button type="button" aria-pressed={gapFilter === gap.id} disabled={!count} onClick={() => setGapFilter((current) => current === gap.id ? null : gap.id)}>
              <span>{gap.label}</span><b>{count}</b>
            </button>
            <span className="dash-bar" aria-hidden="true"><span style={{ width: `${inScope.length ? 100 - (count / inScope.length) * 100 : 100}%` }} /></span>
          </li>;
        })}</ul>
        <p className="admin-hint">Bấm một dòng để chỉ hiện những người còn thiếu mục đó.</p>
      </section>
    </div>

    <div className="dash-sections-head">
      <h2>{gapFilter ? `${gapLabel(gapFilter)} · ${gapCount(gapFilter)} người` : "Theo khu an nghỉ"}</h2>
      {gapFilter && <button type="button" className="admin-link" onClick={() => setGapFilter(null)}>Bỏ lọc</button>}
    </div>
    {sections.map(({ area, members }) => {
      const done = members.filter((profile) => !gapsById.get(profile.id)?.length).length;
      return <section key={area} className="dash-section" aria-label={area}>
        <h3>{area} <small>{members.length} người · {done} đủ thông tin</small></h3>
        <div className="dash-tiles">{members.map((profile) => <Tile key={profile.id} profile={profile} gaps={gapsById.get(profile.id) ?? []} onOpen={() => setOpenId(profile.id)} />)}</div>
      </section>;
    })}
    {!sections.length && <p className="admin-muted">Không còn ai thiếu mục này.</p>}

    <QuickEdit profile={openProfile} gaps={openProfile ? gapsById.get(openProfile.id) ?? [] : []} counts={openProfile ? counts.get(openProfile.id) ?? { works: 0, milestones: 0 } : undefined} onClose={() => setOpenId(null)} />
  </>;
}
