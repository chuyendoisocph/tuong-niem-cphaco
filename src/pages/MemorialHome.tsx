import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Flame, Play, Search } from "lucide-react";
import { MemorialFooter, MemorialHeader, MemorialPortrait } from "@/components/memorial/MemorialLayout";
import { useAllWorks, useArtistQuotes, useArtists, useRecentTributes, useWorkStories, type MemorialArtist } from "@/hooks/usePublicMemorial";
import { deathsInMonth, foldVietnamese, formatLifespan, nextAnniversary, parseLooseDate, parseName, publicHttpUrl, revisitVerb, workCaption } from "@/lib/memorial";
import { memorialImages } from "@/lib/memorialImages";
import { resetMetaTags, updateMetaTags } from "@/utils/metaTags";

const artistHref = (artist: MemorialArtist) => "/" + (artist.slug || artist.id);
const pad = (value: number) => String(value).padStart(2, "0");
const dotDate = (date: Date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
const rotate = <T,>(items: T[], start: number) => [...items.slice(start), ...items.slice(0, start)];
const dayOfYear = (date: Date) => Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 86_400_000);
const nearestRemembrance = (artists: MemorialArtist[], today: Date) => artists.reduce<{
  artist: MemorialArtist;
  daysUntil: number;
  date: Date;
  years: number;
} | null>((nearest, artist) => {
  const anniversary = nextAnniversary(artist.death_date, today);
  if (!anniversary) return nearest;
  if (!nearest || anniversary.daysUntil < nearest.daysUntil || (anniversary.daysUntil === nearest.daysUntil && artist.name.localeCompare(nearest.artist.name, "vi") < 0)) {
    return { artist, daysUntil: anniversary.daysUntil, date: anniversary.date, years: anniversary.years };
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
  const { data: recentTributes = [] } = useRecentTributes(3);
  const { data: workStories = new Map<string, string>() } = useWorkStories();
  const { data: quotes = [] } = useArtistQuotes();
  const previewRemembrance = import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "anniversary";
  const nextRemembrance = nearestRemembrance(artists, today);
  const previewDate = previewRemembrance && nextRemembrance && nextRemembrance.daysUntil > 0
    ? new Date(nextRemembrance.date.getFullYear(), nextRemembrance.date.getMonth(), nextRemembrance.date.getDate() - 1)
    : today;
  const heroRemembrance = nearestRemembrance(artists, previewDate);
  const showRemembrance = !!heroRemembrance && heroRemembrance.daysUntil <= 7;
  const remembranceToday = heroRemembrance?.daysUntil === 0;
  const otherRemembrances = showRemembrance
    ? artists.filter((artist) => artist.id !== heroRemembrance?.artist.id && (nextAnniversary(artist.death_date, previewDate)?.daysUntil ?? 99) <= 7).length
    : 0;

  useEffect(() => {
    updateMetaTags({ title: "Đường Nghệ Sỹ · Hoa Viên Bình Dương | Tưởng niệm nghệ sĩ", description: "Nhớ về những nghệ sĩ đang an nghỉ tại Đường Nghệ Sỹ, Hoa Viên Bình Dương.", url: window.location.href });
    return () => resetMetaTags();
  }, []);

  const selectedArtists = deathsInMonth(artists, selectedMonth);

  const normalizedSearch = foldVietnamese(search.trim());
  const matches = normalizedSearch
    ? artists.filter((artist) => foldVietnamese(artist.name + " " + (artist.tagline ?? "")).includes(normalizedSearch)).slice(0, 8)
    : [];
  const artistsById = new Map(artists.map((artist) => [artist.id, artist]));
  const works = allWorks.filter((work) => artistsById.has(work.profile_id));
  const firstWorks = works.filter((work, index) => works.findIndex((other) => other.profile_id === work.profile_id) === index);
  // The week of an anniversary features that artist; otherwise works with a story or listen link come first.
  const remembranceWork = showRemembrance && heroRemembrance ? works.find((work) => work.profile_id === heroRemembrance.artist.id) : undefined;
  const tellableWorks = works.filter((work) => workStories.has(work.id) || publicHttpUrl(work.url));
  const rotationPool = tellableWorks.length ? tellableWorks : firstWorks;
  const featuredWork = remembranceWork ?? (rotationPool.length ? rotationPool[dayOfYear(today) % rotationPool.length] : undefined);
  const featuredArtist = featuredWork ? artistsById.get(featuredWork.profile_id) : undefined;
  const featuredStory = featuredWork ? workStories.get(featuredWork.id) : undefined;
  const featuredUrl = publicHttpUrl(featuredWork?.url);
  const featuredVerb = featuredWork && featuredArtist ? revisitVerb(featuredWork, featuredArtist.name) : "Xem lại";
  const otherWorks = firstWorks.filter((work) => work.profile_id !== featuredWork?.profile_id);
  const moreWorks = rotate(otherWorks, otherWorks.length ? dayOfYear(today) % otherWorks.length : 0).slice(0, 3);
  const shownQuotes = rotate(quotes, quotes.length ? dayOfYear(today) % quotes.length : 0).slice(0, 2);

  return <div className="memorial">
    <MemorialHeader />
    {isLoading ? <HomeLoading /> : error ? <main className="memorial-shell memorial-not-found"><h1 className="memorial-section-title">Chưa tải được trang tưởng niệm</h1><p>Đường truyền có thể đang gián đoạn. Bạn có thể thử tải lại.</p><div className="memorial-retry-actions"><button type="button" className="memorial-button" disabled={isFetching} onClick={() => void refetch()}>{isFetching ? "Đang tải lại…" : "Thử tải lại"}</button><Link className="memorial-text-link" to="/danh-sach">Xem danh sách nghệ sĩ</Link></div></main> : <main>
      <section className="memorial-home-hero" aria-label="Tưởng nhớ các nghệ sĩ" data-remembrance={showRemembrance ? (remembranceToday ? "today" : "upcoming") : undefined}>
        <div className="memorial-home-hero-photo">
          {memorialImages.entrance && <img src={memorialImages.entrance} alt="Lối vào Đường Nghệ Sỹ với tảng đá khắc tên giữa luống hoa, Hoa Viên Bình Dương" fetchPriority="high" />}
        </div>
        <div className="memorial-shell memorial-home-hero-body">
          <h1 className="memorial-display">Tưởng nhớ những <em>nghệ sĩ đã khuất.</em></h1>
          <p className="memorial-hero-lead">Cùng nhớ về cuộc đời, tác phẩm và dấu ấn của những người nghệ sĩ đang an nghỉ tại đây.</p>
          <form className="memorial-hero-search" role="search" onSubmit={(event) => { event.preventDefault(); document.getElementById("tim-nghe-si")?.scrollIntoView({ behavior: "smooth" }); }}>
            <Search size={20} aria-hidden="true" />
            <input type="search" aria-label="Tìm nghệ sĩ theo tên" placeholder="Tìm tên nghệ sĩ" value={search} onChange={(event) => setSearch(event.target.value)} />
            <button className="memorial-button" type="submit">Tìm</button>
          </form>
          {showRemembrance && heroRemembrance && <Link className="memorial-hero-remembrance" to={artistHref(heroRemembrance.artist)}>
            <MemorialPortrait src={heroRemembrance.artist.avatar_url} name={heroRemembrance.artist.name} loading="eager" />
            <span className="memorial-hero-remembrance-copy">
              <span className="memorial-hero-remembrance-status"><Flame size={18} aria-hidden="true" />{previewRemembrance && "Bản xem thử · "}{remembranceToday ? "Hôm nay là ngày tưởng niệm" : `Còn ${heroRemembrance.daysUntil} ngày đến ngày tưởng niệm`}</span>
              <strong>{heroRemembrance.artist.name}</strong>
              <span className="memorial-hero-remembrance-meta">{remembranceToday ? `Tròn ${heroRemembrance.years} năm ngày mất` : `${heroRemembrance.years} năm ngày mất`} · {heroRemembrance.date.getDate()}/{heroRemembrance.date.getMonth() + 1}</span>
              {otherRemembrances > 0 && <span className="memorial-hero-remembrance-others">và {otherRemembrances} nghệ sĩ khác có ngày tưởng niệm trong tuần này</span>}
              <span className="memorial-hero-remembrance-cta">Tưởng niệm<ArrowRight size={17} aria-hidden="true" /></span>
            </span>
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
          <p className="memorial-face-caption">Giới thiệu {Math.min(artists.length, 8)} trong {artists.length} nghệ sĩ đang an nghỉ tại Đường Nghệ Sỹ.</p>
        </>}
      </section>

      {featuredWork && featuredArtist && <section className="memorial-listen-band" aria-labelledby="listen-title">
        <div className="memorial-shell memorial-section">
          <div className="memorial-section-head"><h2 id="listen-title" className="memorial-section-title">Hôm nay nhớ lại</h2></div>
          <div className="memorial-listen">
            <Link className="memorial-listen-portrait" to={artistHref(featuredArtist)} tabIndex={-1} aria-hidden="true"><MemorialPortrait key={featuredArtist.id} src={featuredArtist.avatar_url} name={featuredArtist.name} /></Link>
            <div className="memorial-listen-copy">
              {remembranceWork && heroRemembrance && <p className="memorial-listen-context"><Flame size={17} aria-hidden="true" />Tuần tưởng niệm {featuredArtist.name} · {heroRemembrance.date.getDate()}/{heroRemembrance.date.getMonth() + 1}</p>}
              <h3>{featuredWork.title}</h3>
              <p className="memorial-listen-meta">{[workCaption(featuredWork), featuredArtist.name].filter(Boolean).join(" · ")}</p>
              {featuredStory && <p className="memorial-listen-story">{featuredStory}</p>}
              <div className="memorial-listen-actions">
                {featuredUrl && <a className="memorial-button" href={featuredUrl} target="_blank" rel="noopener noreferrer">{featuredVerb === "Đọc lại" ? <BookOpen size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}{featuredVerb}</a>}
                <Link className="memorial-text-link" to={artistHref(featuredArtist)}>Xem trang tưởng niệm<ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            </div>
          </div>
          {moreWorks.length > 0 && <div className="memorial-listen-more">
            <h3>Những tác phẩm khác</h3>
            <ul>{moreWorks.map((work) => {
              const artist = artistsById.get(work.profile_id);
              return artist && <li key={work.id}><Link className="memorial-name-link" to={artistHref(artist)}><strong>{work.title}</strong><small>{artist.name}</small></Link></li>;
            })}</ul>
          </div>}
        </div>
      </section>}

      <section className="memorial-shell memorial-section memorial-voices" aria-labelledby="voices-title">
        {shownQuotes.length > 0 && <>
          <div className="memorial-section-head"><h2 id="voices-title" className="memorial-section-title">Lời người ở lại</h2></div>
          <div className="memorial-quotes">{shownQuotes.map((quote) => {
            const artist = artistsById.get(quote.profile_id);
            const sourceUrl = publicHttpUrl(quote.url);
            return <figure key={quote.id}>
              <blockquote>“{quote.quote}”</blockquote>
              <figcaption>
                <span>{[quote.speaker, artist && `về ${artist.name}`].filter(Boolean).join(", ")}</span>
                {quote.source && (sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{quote.source}</a> : <cite>{quote.source}</cite>)}
              </figcaption>
            </figure>;
          })}</div>
        </>}
        <div className="memorial-visitor-notes">
          {shownQuotes.length > 0 ? <h3>Những lời tưởng nhớ</h3> : <div className="memorial-section-head"><h2 id="voices-title" className="memorial-section-title">Những lời tưởng nhớ</h2></div>}
          {recentTributes.length > 0 && <div className="memorial-visitor-list">{recentTributes.map((tribute) => <figure key={tribute.id}>
            <blockquote>“{tribute.content}”</blockquote>
            <figcaption>{tribute.author_name} · gửi {parseName(tribute.artist.name).shortName}{tribute.created_at ? " · " + dotDate(new Date(tribute.created_at)) : ""}</figcaption>
          </figure>)}</div>}
          {showRemembrance && heroRemembrance
            ? <Link className="memorial-invite" to={artistHref(heroRemembrance.artist) + "#gui-loi"}>
              <span>{remembranceToday ? "Hôm nay" : `Ngày ${heroRemembrance.date.getDate()}/${heroRemembrance.date.getMonth() + 1}`} tròn {heroRemembrance.years} năm {heroRemembrance.artist.name} rời xa.</span>
              <strong>Gửi một lời tưởng nhớ<ArrowRight size={17} aria-hidden="true" /></strong>
            </Link>
            : <Link className="memorial-invite" to="/danh-sach"><span>{recentTributes.length ? "Bạn cũng có thể gửi một lời." : "Chưa có lời tưởng nhớ nào."}</span><strong>Chọn một nghệ sĩ để gửi lời<ArrowRight size={17} aria-hidden="true" /></strong></Link>}
        </div>
      </section>
    </main>}
    <MemorialFooter />
  </div>;
}
