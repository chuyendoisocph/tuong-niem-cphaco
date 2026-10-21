import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Flower2, MapPin, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MemorialFooter, MemorialHeader, MemorialPage, MemorialPortrait } from "@/components/memorial/MemorialLayout";
import { TributeForm } from "@/components/memorial/TributeForm";
import { useArtist, useArtistPhotos, useArtists, useFlowerCount, useMemorialItems, useOfferFlower, useTributes, type MemorialArtist } from "@/hooks/usePublicMemorial";
import { foldVietnamese, formatLifespan, formatLooseDate, gratitudeReason, nextAnniversary, parseLooseDate, parseName, substantiveMilestoneCount, workCaption, worksHeading } from "@/lib/memorial";
import { sanitizeHtml } from "@/lib/sanitize";
import { resetMetaTags, updateMetaTags } from "@/utils/metaTags";

const artistHref = (artist: MemorialArtist) => "/" + (artist.slug || artist.id);

function publicHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
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

  useEffect(() => {
    if (!artist) return;
    updateMetaTags({
      title: artist.name + " | Nhịp cầu tri ân",
      description: "Nhớ về " + artist.name + " tại Đường Nghệ sĩ, Hoa Viên Bình Dương.",
      image: artist.avatar_url,
      url: window.location.href,
    });
    return () => resetMetaTags();
  }, [artist]);

  useEffect(() => {
    if (!isLoading && !error && !artist) {
      document.title = "Không tìm thấy trang này. | Nhịp cầu tri ân";
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
  if (!artist) return <MemorialPage><main className="memorial-shell memorial-not-found"><h1 className="memorial-section-title">Không tìm thấy trang này.</h1><Link className="memorial-text-link" to="/">Về Nhịp cầu tri ân</Link></main></MemorialPage>;

  const { honorific, profession, shortName } = parseName(artist.name);
  const works = items.filter((item) => item.kind === "work" && foldVietnamese(item.title) !== foldVietnamese(artist.tagline ?? ""));
  const signature = works[0];
  const otherWorks = signature ? works.slice(1) : [];
  const milestones = items.filter((item) => item.kind === "milestone");
  const showTimeline = substantiveMilestoneCount(milestones) >= 2;
  const date = parseLooseDate(artist.death_date);
  const today = new Date();
  const anniversaryToday = date && !date.yearOnly && date.month === today.getMonth() + 1 && date.day === today.getDate();
  const years = date ? today.getFullYear() - date.year : 0;
  const nextMemorial = nextAnniversary(artist.death_date, today);
  const mapUrl = publicHttpUrl(artist.maps_url);
  const galleryPhotos = photos.flatMap((photo) => {
    const url = publicHttpUrl(photo.url);
    return url ? [{ ...photo, url }] : [];
  });
  const pageUrl = window.location.origin + artistHref(artist);
  const related = allArtists.filter((other) => other.id !== artist.id).slice(0, 4);

  return <div className="memorial">
    <MemorialHeader />
    <main>
      <section className="memorial-shell-narrow memorial-detail-hero">
        <div>
          {(honorific || profession) && <p className="memorial-eyebrow memorial-enter">{[honorific, profession].filter(Boolean).join(" ")}</p>}
          <h1 className="memorial-display memorial-enter">{shortName}</h1>
          {artist.tagline && <p className="memorial-tagline memorial-enter">{artist.tagline}</p>}
          <div className="memorial-life-dates memorial-mono memorial-enter"><span>Sinh {formatLooseDate(artist.birth_date)}</span><span>Mất {formatLooseDate(artist.death_date)}</span></div>
          <div className="memorial-detail-actions memorial-enter"><a className="memorial-button" href="#gui-loi">Gửi lời tri ân</a><button className="memorial-button memorial-button-outline" type="button" onClick={share}><Share2 size={17} aria-hidden="true" />{copied ? "Đã chép liên kết" : "Chia sẻ"}</button></div>
        </div>
        <MemorialPortrait src={artist.avatar_url} name={artist.name} loading="eager" className="memorial-enter" />
      </section>

      <nav className="memorial-detail-nav" aria-label="Các mục trên trang nghệ sĩ"><div className="memorial-shell-narrow memorial-detail-nav-inner">
        {signature && <a href="#tac-pham">Tác phẩm</a>}
        {(artist.biography || showTimeline) && <a href="#cuoc-doi">Cuộc đời</a>}
        {galleryPhotos.length > 0 && <a href="#anh-tu-lieu">Ảnh tư liệu</a>}
        <a href="#gui-loi">Gửi lời tri ân</a><a href="#loi-tri-an">Lời đã gửi</a><a href="#noi-an-nghi">Nơi an nghỉ</a>
      </div></nav>

      {nextMemorial && <aside className="memorial-shell-narrow memorial-anniversary" aria-label="Ngày tưởng nhớ hằng năm">
        <div><p className="memorial-eyebrow">Ngày tưởng nhớ hằng năm</p><strong>{nextMemorial.date.getDate()}/{nextMemorial.date.getMonth() + 1}</strong></div>
        <p>{nextMemorial.isToday ? `Hôm nay là ngày tưởng nhớ ${shortName}.` : `Còn ${nextMemorial.daysUntil} ngày đến ngày tưởng nhớ ${shortName}.`}</p>
        <a className="memorial-text-link" href="#gui-loi">Gửi một lời</a>
      </aside>}

      {signature && <section id="tac-pham" className="memorial-signature memorial-reveal" aria-label="Tác phẩm chữ ký">
        <p className="memorial-eyebrow">{workCaption(signature)}</p>
        <h2>{signature.title}</h2>
      </section>}

      {otherWorks.length > 0 && <section className="memorial-shell-narrow memorial-section memorial-reveal" aria-labelledby="other-works">
        <div className="memorial-section-head"><h2 id="other-works" className="memorial-section-title">{worksHeading(otherWorks)}</h2></div>
        <div className="memorial-works-list">{otherWorks.map((work) => <div key={work.id} className="memorial-works-row"><span className="memorial-mono">{work.year ?? ""}</span><div><h3>{work.title}</h3>{work.description && <p>{work.description}</p>}</div></div>)}</div>
      </section>}

      {(artist.biography || showTimeline) && <section id="cuoc-doi" className="memorial-shell-narrow memorial-section memorial-reveal" aria-labelledby="life-title">
        <div className="memorial-section-head"><h2 id="life-title" className="memorial-section-title">Cuộc đời</h2></div>
        {artist.biography && <div className="memorial-biography" dangerouslySetInnerHTML={{ __html: sanitizeHtml(artist.biography) }} />}
        {showTimeline && <div className="memorial-timeline">{milestones.map((item) => <div key={item.id} className="memorial-timeline-item"><span className="memorial-mono">{item.year ?? ""}</span><div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}</div></div>)}</div>}
      </section>}

      {galleryPhotos.length > 0 && <section id="anh-tu-lieu" className="memorial-shell-narrow memorial-section memorial-reveal" aria-labelledby="photos-title">
        <div className="memorial-section-head"><h2 id="photos-title" className="memorial-section-title">Ảnh tư liệu</h2><p>{galleryPhotos.length} hình ảnh</p></div>
        <div className="memorial-photo-grid">{galleryPhotos.map((photo) => <figure key={photo.id}><a href={photo.url} target="_blank" rel="noopener noreferrer" aria-label={photo.caption ? `Xem ảnh: ${photo.caption}` : `Xem ảnh tư liệu về ${shortName}`}><img src={photo.url} alt={photo.caption || `Ảnh tư liệu về ${artist.name}`} loading="lazy" /></a>{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}</div>
      </section>}

      <section id="gui-loi" className="memorial-bridge" aria-label="Viết lời tri ân">
        <div className="memorial-shell-narrow memorial-bridge-inner">
          <div className="memorial-bridge-column memorial-from-left">
            <h2 className="memorial-section-title">Cảm ơn {shortName} {gratitudeReason(artist.name, works)}</h2>
            <p className="memorial-prose">{anniversaryToday
              ? "Hôm nay tròn " + years + " năm ngày " + shortName + " rời xa. Bạn có thể gửi một lời."
              : "Nếu tác phẩm của " + shortName + " từng đi cùng bạn, xin gửi lại một lời."}</p>
            <TributeForm profileId={artist.id} shortName={shortName} />
          </div>
          <div className="memorial-bridge-column memorial-flower-panel memorial-from-right">
            <h2 className="memorial-section-title">Hoặc dâng một đóa hoa</h2>
            <p>Khi chưa biết nói gì, một đóa hoa cũng là một lời.</p>
            <button className="memorial-button memorial-button-outline" type="button" disabled={offerFlower.isPending} onClick={() => offerFlower.mutate()}><Flower2 size={18} aria-hidden="true" />Dâng hoa</button>
            <p className="memorial-flower-count">{flowerCount} đóa đã dâng</p>
            {offerFlower.isError && <p className="memorial-form-error" role="alert">Chưa dâng hoa được. Xin thử lại sau ít phút.</p>}
          </div>
        </div>
      </section>

      <section id="loi-tri-an" className="memorial-shell-narrow memorial-section memorial-reveal" aria-labelledby="tributes-title">
        <div className="memorial-section-head"><h2 id="tributes-title" className="memorial-section-title">Những lời gửi lại</h2></div>
        {tributes.length ? <div className="memorial-tributes-grid">{tributes.map((tribute) => <figure key={tribute.id}><blockquote className="memorial-quote">“{tribute.content}”</blockquote><figcaption className="memorial-tribute-byline">{tribute.author_name}, {tribute.created_at ? new Date(tribute.created_at).toLocaleDateString("vi-VN") : ""}</figcaption></figure>)}</div>
          : <p className="memorial-prose">Chưa có lời nào được gửi tới {shortName}. Lời của bạn sẽ là lời đầu tiên.</p>}
      </section>

      <section id="noi-an-nghi" className="memorial-shell-narrow memorial-section memorial-reveal" aria-labelledby="grave-title">
        <div className="memorial-section-head"><h2 id="grave-title" className="memorial-section-title">Nơi an nghỉ</h2></div>
        <div className="memorial-grave-details">
          <p className="memorial-prose">Đường Nghệ sĩ, Hoa Viên Nghĩa trang Bình Dương.</p>
          {artist.grave_number && <><p className="memorial-eyebrow">Số mộ</p><p className="memorial-grave-number">{artist.grave_number}</p></>}
          {mapUrl && <a className="memorial-text-link" href={mapUrl} target="_blank" rel="noopener noreferrer"><MapPin size={17} aria-hidden="true" />Xem vị trí mộ trên bản đồ</a>}
          <div className="memorial-page-qr"><div className="memorial-page-qr-code" role="img" aria-label={`Mã QR dẫn đến trang tưởng niệm của ${artist.name}`}><QRCodeSVG value={pageUrl} size={96} level="M" bgColor="#fdfcf8" fgColor="#1e3a5f" /></div><div><strong>Mã QR trang tưởng niệm</strong><p>{["localhost", "127.0.0.1"].includes(window.location.hostname) ? "Mã xem thử trên máy này. Khi trang có địa chỉ công khai, mã sẽ mở được trên thiết bị khác." : `Quét mã để mở lại trang tưởng niệm của ${shortName}.`}</p></div></div>
        </div>
      </section>

      {related.length > 0 && <section className="memorial-shell-narrow memorial-section memorial-reveal" aria-labelledby="related-title">
        <div className="memorial-section-head"><h2 id="related-title" className="memorial-section-title">Những người chúng ta cũng cảm ơn</h2><Link className="memorial-text-link" to="/danh-sach">Tất cả nghệ sĩ</Link></div>
        <div className="memorial-related-grid">{related.map((other) => <Link key={other.id} className="memorial-name-link" to={artistHref(other)}><MemorialPortrait src={other.avatar_url} name={other.name} /><h3>{parseName(other.name).shortName}</h3><p>{formatLifespan(other.birth_date, other.death_date)}</p></Link>)}</div>
      </section>}
    </main>
    <MemorialFooter><p className="memorial-prose">Tiểu sử và hình ảnh do CPHACO tổng hợp. Nếu bạn phát hiện sai sót hoặc giữ tư liệu về nghệ sĩ, xin liên hệ để chúng tôi đính chính và ghi nguồn.</p></MemorialFooter>
  </div>;
}
