import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { MemorialFooter, MemorialHeader, MemorialImage, MemorialPortrait } from "@/components/memorial/MemorialLayout";
import { useAllWorks, useArtists, useRecentTributes, type MemorialArtist } from "@/hooks/usePublicMemorial";
import { deathsInMonth, foldVietnamese, formatLifespan, nextAnniversary, parseLooseDate, parseName, workCaption } from "@/lib/memorial";
import { memorialImages } from "@/lib/memorialImages";
import { resetMetaTags, updateMetaTags } from "@/utils/metaTags";

const artistHref = (artist: MemorialArtist) => "/" + (artist.slug || artist.id);
const dayOfYear = (date: Date) => Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 86_400_000);
const nearestRemembrance = (artists: MemorialArtist[], today: Date) => artists.reduce<{
  artist: MemorialArtist;
  daysUntil: number;
  date: Date;
} | null>((nearest, artist) => {
  const anniversary = nextAnniversary(artist.death_date, today);
  if (!anniversary) return nearest;
  if (!nearest || anniversary.daysUntil < nearest.daysUntil || (anniversary.daysUntil === nearest.daysUntil && artist.name.localeCompare(nearest.artist.name, "vi") < 0)) {
    return { artist, daysUntil: anniversary.daysUntil, date: anniversary.date };
  }
  return nearest;
}, null);

function HomeLoading() {
  return <main className="memorial-shell" aria-label="Đang tải">
    <div className="memorial-hero">
      <div><div className="memorial-skeleton" style={{ width: "48%", height: 14, marginBottom: 36 }} /><div className="memorial-skeleton" style={{ width: "90%", height: 80, marginBottom: 16 }} /><div className="memorial-skeleton" style={{ width: "65%", height: 60 }} /></div>
      <div className="memorial-skeleton" style={{ aspectRatio: "3 / 4" }} />
    </div>
    <div className="memorial-skeleton" style={{ height: 54, width: "40%", marginBottom: 32 }} />
    <div className="memorial-skeleton" style={{ height: 180 }} />
  </main>;
}

export default function MemorialHome() {
  const today = useMemo(() => new Date(), []);
  const currentMonth = today.getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const { data: artists = [], isLoading, isFetching, error, refetch } = useArtists();
  const { data: allWorks = [] } = useAllWorks();
  const { data: recentTributes = [] } = useRecentTributes(2);
  const previewRemembrance = import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "anniversary";
  const nextRemembrance = nearestRemembrance(artists, today);
  const previewDate = previewRemembrance && nextRemembrance && nextRemembrance.daysUntil > 0
    ? new Date(nextRemembrance.date.getFullYear(), nextRemembrance.date.getMonth(), nextRemembrance.date.getDate() - 1)
    : today;
  const heroRemembrance = nearestRemembrance(artists, previewDate);

  useEffect(() => {
    updateMetaTags({ title: "Nhịp cầu tri ân | Đường Nghệ sĩ, Hoa Viên Bình Dương", description: "Nhớ về những nghệ sĩ đang an nghỉ tại Đường Nghệ sĩ, Hoa Viên Bình Dương.", url: window.location.href });
    return () => resetMetaTags();
  }, []);

  const selectedArtists = deathsInMonth(artists, selectedMonth);

  const normalizedSearch = foldVietnamese(search.trim());
  const matches = normalizedSearch
    ? artists.filter((artist) => foldVietnamese(artist.name + " " + (artist.tagline ?? "")).includes(normalizedSearch)).slice(0, 8)
    : [];
  const artistsById = new Map(artists.map((artist) => [artist.id, artist]));
  const worksByArtist = new Map<string, typeof allWorks[number]>();
  for (const work of allWorks) if (!worksByArtist.has(work.profile_id)) worksByArtist.set(work.profile_id, work);
  const workHighlights = [...worksByArtist.values()].filter((work) => artistsById.has(work.profile_id));
  const showWorks = workHighlights.length > 0;
  const startWork = workHighlights.length ? dayOfYear(today) % workHighlights.length : 0;
  const rotatingWorks = [...workHighlights.slice(startWork), ...workHighlights.slice(0, startWork)].slice(0, 4);

  return <div className="memorial">
    <MemorialHeader />
    {isLoading ? <HomeLoading /> : error ? <main className="memorial-shell memorial-not-found"><h1 className="memorial-section-title">Chưa tải được trang tưởng niệm</h1><p>Đường truyền có thể đang gián đoạn. Bạn có thể thử tải lại.</p><div className="memorial-retry-actions"><button type="button" className="memorial-button" disabled={isFetching} onClick={() => void refetch()}>{isFetching ? "Đang tải lại…" : "Thử tải lại"}</button><Link className="memorial-text-link" to="/danh-sach">Xem danh sách nghệ sĩ</Link></div></main> : <main>
      <section className="memorial-home-hero" aria-label="Tưởng nhớ các nghệ sĩ">
        {memorialImages.entrance && <img className="memorial-home-hero-image" src={memorialImages.entrance} alt="" fetchPriority="high" />}
        <div className="memorial-shell memorial-home-hero-inner">
          <p className="memorial-eyebrow memorial-enter">Đường Nghệ sĩ, Hoa Viên Bình Dương</p>
          <h1 className="memorial-display"><span className="memorial-enter">Tưởng nhớ những</span>{" "}<span className="memorial-gold-text memorial-enter">nghệ sĩ đã khuất.</span></h1>
          <p className="memorial-hero-lead memorial-enter">Cùng nhớ về cuộc đời, tác phẩm và dấu ấn của những người nghệ sĩ đang an nghỉ tại đây.</p>
          <a className="memorial-button memorial-enter" href="#tim-nghe-si">Tìm một nghệ sĩ</a>
          {heroRemembrance && heroRemembrance.daysUntil <= 7 && <Link className="memorial-hero-remembrance memorial-enter" to={artistHref(heroRemembrance.artist)} aria-label={`${previewRemembrance ? "Bản xem thử. " : ""}${heroRemembrance.daysUntil === 0 ? "Hôm nay là ngày tưởng nhớ" : `Còn ${heroRemembrance.daysUntil} ngày đến ngày tưởng nhớ`} của ${heroRemembrance.artist.name}. Xem trang tưởng niệm`}>
            <MemorialPortrait src={heroRemembrance.artist.avatar_url} name={heroRemembrance.artist.name} />
            <span className="memorial-hero-remembrance-copy"><span className="memorial-hero-remembrance-status">{previewRemembrance && "Bản xem thử · "}{heroRemembrance.daysUntil === 0 ? "Hôm nay là ngày tưởng nhớ" : `Còn ${heroRemembrance.daysUntil} ngày đến ngày tưởng nhớ`}</span><strong>{heroRemembrance.artist.name}</strong><small>{heroRemembrance.date.getDate()}/{heroRemembrance.date.getMonth() + 1} · Xem trang tưởng niệm</small></span>
          </Link>}
        </div>
      </section>

      <section className="memorial-shell memorial-section memorial-reveal" aria-labelledby="month-title">
        <div className="memorial-section-head"><h2 id="month-title" className="memorial-section-title">Tháng {selectedMonth}</h2><p>{selectedArtists.length ? selectedArtists.length + " nghệ sĩ có ngày tưởng nhớ trong tháng" : "Chưa có ngày tưởng nhớ trong danh sách"}</p></div>
        <label className="memorial-month-select">Chọn tháng tưởng nhớ<select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => {
          const month = index + 1;
          return <option key={month} value={month}>Tháng {month} · {deathsInMonth(artists, month).length} nghệ sĩ</option>;
        })}</select></label>
        <div className="memorial-months" role="group" aria-label="Chọn tháng">
          {Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const count = deathsInMonth(artists, month).length;
            return <button key={month} type="button" className="memorial-month" aria-pressed={selectedMonth === month} data-current={month === currentMonth} onClick={() => setSelectedMonth(month)} aria-label={"Tháng " + month + ", " + count + " nghệ sĩ có ngày tưởng nhớ"}>
              <strong>{month}</strong><small data-empty={count === 0}>{count} nghệ sĩ</small>
            </button>;
          })}
        </div>
        {selectedArtists.length ? <div className="memorial-artist-grid memorial-stagger" data-many={selectedArtists.length > 4}>
          {selectedArtists.map((artist) => {
            const day = parseLooseDate(artist.death_date)?.day ?? 0;
            const isPast = selectedMonth === currentMonth && day < today.getDate();
            const isToday = selectedMonth === currentMonth && day === today.getDate();
            const daysUntil = selectedMonth === currentMonth ? nextAnniversary(artist.death_date, today)?.daysUntil : null;
            const isUpcoming = daysUntil !== null && daysUntil !== undefined && daysUntil > 0 && daysUntil <= 7;
            return <Link key={artist.id} to={artistHref(artist)} className={"memorial-artist-card memorial-name-link" + (isPast ? " is-past" : "")}>
              <MemorialPortrait src={artist.avatar_url} name={artist.name} />
              <div className="memorial-artist-card-meta"><span className="memorial-artist-card-day">{String(day).padStart(2, "0")}</span><div><h3>{artist.name}</h3><p>{formatLifespan(artist.birth_date, artist.death_date)}</p>{isToday && <span className="memorial-card-flag">Ngày tưởng nhớ hôm nay</span>}{isUpcoming && <span className="memorial-card-flag">Sắp đến ngày tưởng nhớ</span>}</div></div>
            </Link>;
          })}
        </div> : <p className="memorial-section-empty">Tháng {selectedMonth} chưa có nghệ sĩ nào có ngày tưởng nhớ trong danh sách. Bạn có thể chọn tháng khác hoặc tìm nghệ sĩ ở bên dưới.</p>}
      </section>

      <section id="tim-nghe-si" className="memorial-shell memorial-section memorial-reveal" aria-labelledby="search-title">
        <div className="memorial-section-head"><h2 id="search-title" className="memorial-section-title">Tìm một nghệ sĩ</h2><Link className="memorial-text-link" to="/danh-sach">Xem danh sách đầy đủ</Link></div>
        <label className="memorial-search-field"><Search aria-hidden="true" size={20} /><input type="search" aria-label="Tìm nghệ sĩ theo tên" placeholder="Gõ tên nghệ sĩ, có dấu hay không dấu" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <p className="sr-only" role="status">{normalizedSearch ? `${matches.length} kết quả phù hợp` : `Đang giới thiệu ${Math.min(artists.length, 8)} trong ${artists.length} nghệ sĩ`}</p>
        {normalizedSearch ? matches.length ? <div className="memorial-results">
          {matches.map((artist) => <Link key={artist.id} className="memorial-result memorial-name-link" to={artistHref(artist)}><MemorialPortrait src={artist.avatar_url} name={artist.name} /><span><strong>{artist.name}</strong><small>{formatLifespan(artist.birth_date, artist.death_date)}</small></span></Link>)}
        </div> : <p className="memorial-section-empty">Không có nghệ sĩ nào khớp với “{search.trim()}”.</p> : <>
          <div className="memorial-face-grid memorial-stagger">{artists.slice(0, 8).map((artist) => <Link key={artist.id} to={artistHref(artist)} className="memorial-name-link" aria-label={artist.name + ", " + formatLifespan(artist.birth_date, artist.death_date)}><MemorialPortrait src={artist.avatar_url} name={artist.name} /><strong>{artist.name}</strong><small>{formatLifespan(artist.birth_date, artist.death_date)}</small></Link>)}</div>
          <p className="memorial-face-caption">Giới thiệu {Math.min(artists.length, 8)} trong {artists.length} nghệ sĩ đang an nghỉ tại Đường Nghệ sĩ.</p>
        </>}
      </section>

      <section className="memorial-bridge" aria-label="Nhịp cầu tri ân">
        <div className="memorial-shell memorial-bridge-inner">
          <div className="memorial-bridge-column memorial-from-left">
            {showWorks ? <><h2 className="memorial-section-title">Những gì họ để lại</h2><div className="memorial-work-list">{rotatingWorks.map((work) => {
              const artist = artistsById.get(work.profile_id);
              return artist && <Link key={work.id} className="memorial-name-link" to={artistHref(artist)}><strong>{work.title}</strong><small>{work.description || workCaption(work)}, {artist.name}</small></Link>;
            })}</div></> : <><h2 className="memorial-section-title">Nơi họ an nghỉ</h2><MemorialImage src={memorialImages.marker} alt="Biển chỉ dẫn Đường Nghệ sĩ giữa vườn hoa" position="42% 55%" /><p className="memorial-image-caption">Đường Nghệ sĩ, Hoa Viên Bình Dương</p></>}
          </div>
          <div className="memorial-bridge-column memorial-from-right">
            <h2 className="memorial-section-title">Những lời gửi lại</h2>
            {recentTributes.length ? recentTributes.map((tribute) => <figure key={tribute.id} className="memorial-tribute-snippet"><blockquote>“{tribute.content}”</blockquote><figcaption>{tribute.author_name}, gửi {parseName(tribute.artist.name).shortName}</figcaption></figure>) : <p className="memorial-prose">Chưa có lời tri ân nào. Bạn có thể bắt đầu từ trang của một nghệ sĩ.</p>}
            <div className="memorial-gold-rule" />
            <h3>Bạn đang nhớ đến ai?</h3>
            <p className="memorial-prose">Hãy chọn nghệ sĩ để chia sẻ một kỷ niệm hoặc dâng một đóa hoa trên trang của họ.</p>
            <Link className="memorial-button memorial-button-outline" to="/danh-sach">Tìm nghệ sĩ</Link>
          </div>
        </div>
      </section>
    </main>}
    <MemorialFooter />
  </div>;
}
