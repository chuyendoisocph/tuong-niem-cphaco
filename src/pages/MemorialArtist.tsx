import { useEffect, useState, type KeyboardEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRight, CalendarPlus, Flame, Flower2, MapPin, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MemorialFooter, MemorialHeader, MemorialPage, MemorialPortrait } from "@/components/memorial/MemorialLayout";
import { TributeForm } from "@/components/memorial/TributeForm";
import { useArtist, useArtistPhotos, useArtists, useFlowerCount, useMemorialItems, useOfferFlower, useTributes, type MemorialArtist } from "@/hooks/usePublicMemorial";
import { foldVietnamese, formatLifespan, nextAnniversary, parseLooseDate, parseName, worksHeading } from "@/lib/memorial";
import { sanitizeHtml } from "@/lib/sanitize";
import { resetMetaTags, updateMetaTags } from "@/utils/metaTags";

const artistHref = (artist: MemorialArtist) => "/" + (artist.slug || artist.id);
const TRIBUTE_PREVIEW = 3;
const LONG_BIOGRAPHY = 700;
const pad = (value: number) => String(value).padStart(2, "0");
const dotDate = (date: Date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;

function publicHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function calendarText(value: string): string {
  return value.replace(/[\\;,]/g, (char) => "\\" + char).replace(/\n/g, "\\n");
}

// A yearly all-day event lets visitors keep the remembrance day without giving us any contact details.
function downloadRemembranceCalendar(artist: MemorialArtist, date: Date, pageUrl: string) {
  const day = (value: Date) => `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}`;
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const summary = calendarText(`Ngày tưởng niệm ${artist.name}`);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CPHACO//Nhip cau tri an//VI",
    "BEGIN:VEVENT",
    `UID:${artist.id}@nhip-cau-tri-an`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(date)}`,
    `DTEND;VALUE=DATE:${day(nextDay)}`,
    "RRULE:FREQ=YEARLY",
    `SUMMARY:${summary}`,
    `DESCRIPTION:${calendarText(`Cùng tưởng nhớ ${artist.name}. ${pageUrl}`)}`,
    `URL:${pageUrl}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${summary}`,
    "TRIGGER:-PT16H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tuong-niem-${artist.slug || artist.id}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function MemorialArtist() {
  const { slug } = useParams();
  const location = useLocation();
  const { data: artist, isLoading, error } = useArtist(slug);
  const { data: items = [] } = useMemorialItems(artist?.id);
  const { data: photos = [] } = useArtistPhotos(artist?.id);
  const { data: tributes = [] } = useTributes(artist?.id);
  const { data: flowerCount = 0 } = useFlowerCount(artist?.id);
  const { data: allArtists = [] } = useArtists();
  const offerFlower = useOfferFlower(artist?.id);
  const [copied, setCopied] = useState(false);
  const [showAllTributes, setShowAllTributes] = useState(false);
  const [lifeOpen, setLifeOpen] = useState(false);
  const [legacyTab, setLegacyTab] = useState<string | null>(null);

  useEffect(() => {
    if (!artist) return;
    updateMetaTags({
      title: artist.name + " | Đường Nghệ sĩ · Hoa Viên Bình Dương",
      description: "Nhớ về " + artist.name + " tại Đường Nghệ sĩ, Hoa Viên Bình Dương.",
      image: artist.avatar_url,
      url: window.location.href,
    });
    return () => resetMetaTags();
  }, [artist]);

  useEffect(() => {
    if (!isLoading && !error && !artist) {
      document.title = "Không tìm thấy trang này. | Đường Nghệ sĩ · Hoa Viên Bình Dương";
    }
  }, [artist, error, isLoading]);

  useEffect(() => {
    if (artist && location.hash === "#gui-loi") {
      requestAnimationFrame(() => document.getElementById("gui-loi")?.scrollIntoView());
    }
  }, [artist, location.hash]);

  async function share() {
    const url = artist ? window.location.origin + artistHref(artist) : window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: document.title, url }); } catch { /* Share sheet closed. */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch { /* Clipboard access is unavailable. */ }
  }

  if (isLoading) return <MemorialPage><main className="memorial-shell memorial-not-found" aria-label="Đang tải"><div className="memorial-skeleton" style={{ width: "55%", height: 80 }} /></main></MemorialPage>;
  if (error) return <MemorialPage><main className="memorial-shell memorial-not-found"><p>Không tải được trang. Vui lòng thử lại sau.</p></main></MemorialPage>;
  if (!artist) return <MemorialPage><main className="memorial-shell memorial-not-found"><h1 className="memorial-section-title">Không tìm thấy trang này.</h1><Link className="memorial-text-link" to="/">Về trang chủ Đường Nghệ sĩ</Link></main></MemorialPage>;

  const { honorific, profession, shortName } = parseName(artist.name);
  const works = items.filter((item) => item.kind === "work" && foldVietnamese(item.title) !== foldVietnamese(artist.tagline ?? ""));
  const worksDated = works.some((work) => work.year !== null);
  const milestones = items.filter((item) => item.kind === "milestone");
  const showTimeline = milestones.length >= 2;
  const longBiography = (artist.biography?.length ?? 0) > LONG_BIOGRAPHY;
  const showBiography = !!artist.biography && (showTimeline ? lifeOpen : true);
  const biographyCollapsed = !showTimeline && longBiography && !lifeOpen;
  const showLifeToggle = !!artist.biography && (showTimeline || longBiography);
  const death = parseLooseDate(artist.death_date);
  const nextMemorial = nextAnniversary(artist.death_date, new Date());
  const remembranceHref = nextMemorial ? "#tuong-niem" : "#gui-loi";
  const mapUrl = publicHttpUrl(artist.maps_url);
  const galleryPhotos = photos.flatMap((photo) => {
    const url = publicHttpUrl(photo.url);
    return url ? [{ ...photo, url }] : [];
  });
  const legacyTabs = [
    ...(works.length ? [{ id: "tac-pham", label: worksHeading(works) }] : []),
    ...(galleryPhotos.length ? [{ id: "hinh-anh", label: "Hình ảnh" }] : []),
  ];
  const activeLegacy = legacyTabs.find((tab) => tab.id === legacyTab)?.id ?? legacyTabs[0]?.id;
  const visibleTributes = showAllTributes ? tributes : tributes.slice(0, TRIBUTE_PREVIEW);
  const pageUrl = window.location.origin + artistHref(artist);
  const related = allArtists
    .filter((other) => other.id !== artist.id)
    .map((other) => ({ other, sameArt: profession !== null && parseName(other.name).profession === profession }))
    .sort((left, right) => Number(right.sameArt) - Number(left.sameArt))
    .slice(0, 4)
    .map(({ other }) => other);

  function moveLegacyTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = legacyTabs[(index + step + legacyTabs.length) % legacyTabs.length];
    setLegacyTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }

  return <div className="memorial">
    <MemorialHeader />
    <main className="memorial-detail-main">
      <section className="memorial-shell memorial-detail-hero memorial-enter" aria-labelledby="artist-name">
        <MemorialPortrait src={artist.avatar_url} name={artist.name} loading="eager" />
        <div>
          <h1 id="artist-name" className="memorial-display">
            {(honorific || profession) && <span className="memorial-detail-title">{[honorific, profession].filter(Boolean).join(" ")}</span>}{" "}
            {shortName}
          </h1>
          <p className="memorial-life-dates">{formatLifespan(artist.birth_date, artist.death_date)}</p>
          {artist.tagline && <p className="memorial-tagline">“{artist.tagline}”</p>}
          {nextMemorial?.isToday && <a className="memorial-today-note" href="#tuong-niem"><Flame size={17} aria-hidden="true" />Hôm nay là ngày tưởng niệm {shortName}</a>}
          <div className="memorial-quiet-actions">
            <a href={remembranceHref}><Flame size={17} aria-hidden="true" />Tưởng niệm</a>
            <button type="button" disabled={offerFlower.isPending} onClick={() => offerFlower.mutate()}><Flower2 size={17} aria-hidden="true" />Dâng hoa</button>
            <button type="button" onClick={share}><Share2 size={17} aria-hidden="true" />{copied ? "Đã chép liên kết" : "Chia sẻ"}</button>
          </div>
          <p className="memorial-flower-note" role="status">{offerFlower.isSuccess ? `Bạn vừa dâng một đóa hoa. Đã có ${flowerCount} đóa hoa dâng ${shortName}.` : ""}</p>
          {offerFlower.isError && <p className="memorial-form-error" role="alert">Chưa dâng hoa được. Xin thử lại sau ít phút.</p>}
        </div>
      </section>

      <section id="noi-an-nghi" className="memorial-shell memorial-section" aria-labelledby="grave-title">
        <div className="memorial-grave">
          <div>
            <h2 id="grave-title" className="memorial-section-title">Nơi an nghỉ</h2>
            <p className="memorial-grave-place">Đường Nghệ sĩ, Hoa Viên Nghĩa trang Bình Dương</p>
            {artist.grave_number && <dl className="memorial-grave-facts"><div><dt>Số mộ</dt><dd>{artist.grave_number}</dd></div></dl>}
            {mapUrl && <a className="memorial-text-link" href={mapUrl} target="_blank" rel="noopener noreferrer"><MapPin size={17} aria-hidden="true" />Xem vị trí mộ trên bản đồ<ArrowRight size={16} aria-hidden="true" /></a>}
          </div>
          <div className="memorial-page-qr"><div className="memorial-page-qr-code" role="img" aria-label={`Mã QR dẫn đến trang tưởng niệm của ${artist.name}`}><QRCodeSVG value={pageUrl} size={96} level="M" bgColor="#fdfcf8" fgColor="#1e3a5f" /></div><div><strong>Mã QR trang tưởng niệm</strong><p>{["localhost", "127.0.0.1"].includes(window.location.hostname) ? "Mã xem thử trên máy này. Khi trang có địa chỉ công khai, mã sẽ mở được trên thiết bị khác." : `Quét mã để mở lại trang tưởng niệm của ${shortName}.`}</p></div></div>
        </div>
      </section>

      {(artist.biography || showTimeline) && <section id="cuoc-doi" className="memorial-shell memorial-section" aria-labelledby="life-title">
        <div className="memorial-section-head"><h2 id="life-title" className="memorial-section-title">Cuộc đời & sự nghiệp</h2></div>
        {showTimeline && <ol className="memorial-timeline">{milestones.map((item) => <li key={item.id} className="memorial-timeline-item"><span className="memorial-mono">{item.year ?? ""}</span><div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}</div></li>)}</ol>}
        {showBiography && <div id="tieu-su" className="memorial-biography" data-collapsed={biographyCollapsed} dangerouslySetInnerHTML={{ __html: sanitizeHtml(artist.biography) }} />}
        {showLifeToggle && <button type="button" className="memorial-more" aria-expanded={lifeOpen} aria-controls={showTimeline && !lifeOpen ? undefined : "tieu-su"} onClick={() => setLifeOpen((open) => !open)}>{lifeOpen ? "Thu gọn" : "Xem đầy đủ cuộc đời & sự nghiệp"}</button>}
      </section>}

      {legacyTabs.length > 0 && <section id="dau-an" className="memorial-shell memorial-section" aria-labelledby="legacy-title">
        <div className="memorial-section-head"><h2 id="legacy-title" className="memorial-section-title">Dấu ấn để lại</h2></div>
        {legacyTabs.length > 1 && <div className="memorial-tabs" role="tablist" aria-label="Dấu ấn để lại">
          {legacyTabs.map((tab, index) => <button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={activeLegacy === tab.id} aria-controls={`panel-${tab.id}`} tabIndex={activeLegacy === tab.id ? 0 : -1} onClick={() => setLegacyTab(tab.id)} onKeyDown={(event) => moveLegacyTab(event, index)}>{tab.label}</button>)}
        </div>}
        {activeLegacy === "tac-pham" && <div id="panel-tac-pham" role={legacyTabs.length > 1 ? "tabpanel" : undefined} aria-labelledby={legacyTabs.length > 1 ? "tab-tac-pham" : undefined} className="memorial-works-list">
          {legacyTabs.length === 1 && <h3 className="memorial-legacy-single">{worksHeading(works)}</h3>}
          {works.map((work, index) => <div key={work.id} className="memorial-works-row" data-signature={index === 0} data-dated={worksDated}>{worksDated && <span className="memorial-mono">{work.year ?? ""}</span>}<div><h3>{work.title}</h3>{work.description && <p>{work.description}</p>}</div></div>)}
        </div>}
        {activeLegacy === "hinh-anh" && <div id="panel-hinh-anh" role={legacyTabs.length > 1 ? "tabpanel" : undefined} aria-labelledby={legacyTabs.length > 1 ? "tab-hinh-anh" : undefined} className="memorial-photo-grid">
          {galleryPhotos.map((photo) => <figure key={photo.id}><a href={photo.url} target="_blank" rel="noopener noreferrer" aria-label={photo.caption ? `Xem ảnh: ${photo.caption}` : `Xem ảnh tư liệu về ${shortName}`}><img src={photo.url} alt={photo.caption || `Ảnh tư liệu về ${artist.name}`} loading="lazy" /></a>{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}
        </div>}
      </section>}

      {nextMemorial && death && <section id="tuong-niem" className="memorial-remembrance-day" data-today={nextMemorial.isToday} aria-labelledby="remembrance-title">
        <div className="memorial-shell memorial-remembrance-day-inner">
          <Flame className="memorial-remembrance-flame" size={30} aria-hidden="true" />
          {nextMemorial.isToday ? <>
            <h2 id="remembrance-title" className="memorial-section-title">Tưởng niệm {nextMemorial.years} năm ngày mất</h2>
            <p className="memorial-remembrance-range">{dotDate(new Date(death.year, nextMemorial.date.getMonth(), nextMemorial.date.getDate()))} - {dotDate(nextMemorial.date)}</p>
            <p className="memorial-prose">Hôm nay, cùng dành một phút tưởng nhớ {shortName}.</p>
          </> : <>
            <h2 id="remembrance-title" className="memorial-section-title">Ngày tưởng niệm</h2>
            <p className="memorial-remembrance-range">{nextMemorial.date.getDate()} tháng {nextMemorial.date.getMonth() + 1} hằng năm</p>
            <p className="memorial-prose">Còn {nextMemorial.daysUntil} ngày đến ngày tưởng niệm {shortName}.</p>
          </>}
          <button type="button" className="memorial-button memorial-button-outline" onClick={() => downloadRemembranceCalendar(artist, nextMemorial.date, pageUrl)}><CalendarPlus size={18} aria-hidden="true" />Nhắc tôi vào ngày tưởng niệm</button>
          <p className="memorial-remembrance-note">Ngày tưởng niệm được thêm vào lịch trên máy của bạn, lặp lại mỗi năm.</p>
        </div>
      </section>}

      <section id="loi-tri-an" className="memorial-shell memorial-section" aria-labelledby="tributes-title">
        <div className="memorial-tribute-layout">
          <div id="gui-loi">
            <h2 id="tributes-title" className="memorial-section-title">Để lại đôi lời tưởng nhớ</h2>
            <TributeForm profileId={artist.id} shortName={shortName} />
          </div>
          <div className="memorial-tribute-feed">
            <h3>{tributes.length ? `Những lời tưởng nhớ (${tributes.length})` : "Những lời tưởng nhớ"}</h3>
            {tributes.length ? <>
              {visibleTributes.map((tribute) => <figure key={tribute.id}><blockquote className="memorial-quote">“{tribute.content}”</blockquote><figcaption className="memorial-tribute-byline">{tribute.author_name}{tribute.created_at ? " · " + dotDate(new Date(tribute.created_at)) : ""}</figcaption></figure>)}
              {tributes.length > TRIBUTE_PREVIEW && <button type="button" className="memorial-more" aria-expanded={showAllTributes} onClick={() => setShowAllTributes((open) => !open)}>{showAllTributes ? "Thu gọn" : `Xem thêm ${tributes.length - TRIBUTE_PREVIEW} lời`}</button>}
            </> : <p className="memorial-prose">Chưa có lời nào được gửi tới {shortName}. Lời của bạn sẽ là lời đầu tiên.</p>}
          </div>
        </div>
      </section>

      {related.length > 0 && <section className="memorial-shell memorial-section" aria-labelledby="related-title">
        <div className="memorial-section-head"><h2 id="related-title" className="memorial-section-title">Cùng tưởng nhớ những người nghệ sĩ</h2></div>
        <div className="memorial-related-grid">{related.map((other) => <Link key={other.id} className="memorial-name-link" to={artistHref(other)}><MemorialPortrait src={other.avatar_url} name={other.name} /><h3>{other.name}</h3><p>{formatLifespan(other.birth_date, other.death_date)}</p></Link>)}</div>
        <Link className="memorial-text-link memorial-related-more" to="/danh-sach">Khám phá Đường Nghệ sĩ<ArrowRight size={16} aria-hidden="true" /></Link>
      </section>}
    </main>
    <MemorialFooter><p className="memorial-prose">Tiểu sử và hình ảnh do CPHACO tổng hợp. Nếu bạn phát hiện sai sót hoặc giữ tư liệu về nghệ sĩ, xin liên hệ để chúng tôi đính chính và ghi nguồn.</p></MemorialFooter>
  </div>;
}
