import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { MemorialFooter, MemorialHeader, MemorialPortrait } from "@/components/memorial/MemorialLayout";
import { useArtists } from "@/hooks/usePublicMemorial";
import { foldVietnamese, formatLifespan, groupByDecade, parseName } from "@/lib/memorial";
import { resetMetaTags, updateMetaTags } from "@/utils/metaTags";

export default function MemorialDirectory() {
  const { data: artists = [], isLoading, error } = useArtists();
  const [search, setSearch] = useState("");
  const [profession, setProfession] = useState("Tất cả");

  useEffect(() => {
    updateMetaTags({ title: "Tất cả nghệ sĩ | Nhịp cầu tri ân", description: "Danh sách nghệ sĩ tại Đường Nghệ sĩ, Hoa Viên Bình Dương.", url: window.location.href });
    return () => resetMetaTags();
  }, []);

  const professions = useMemo(() => {
    const distinct = new Set(artists.map((artist) => parseName(artist.name).profession).filter((value): value is string => !!value));
    return ["Tất cả", ...distinct];
  }, [artists]);
  const query = foldVietnamese(search.trim());
  const filtered = artists.filter((artist) =>
    (profession === "Tất cả" || parseName(artist.name).profession === profession)
    && (!query || foldVietnamese(artist.name).includes(query)));
  const groups = groupByDecade(filtered);

  return <div className="memorial">
    <MemorialHeader />
    <main className="memorial-shell">
      <div className="memorial-directory-head">
        <p className="memorial-eyebrow">Đường Nghệ sĩ, Hoa Viên Bình Dương</p>
        <h1 className="memorial-display">Tất cả nghệ sĩ</h1>
        <label className="memorial-search-field"><Search size={20} aria-hidden="true" /><input type="search" aria-label="Tìm theo tên" placeholder="Tìm theo tên" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="memorial-filters" role="group" aria-label="Lọc theo nghề">
          {professions.map((job) => <button key={job} type="button" className="memorial-filter" aria-pressed={profession === job} onClick={() => setProfession(job)}>{job}</button>)}
        </div>
        <p className="memorial-directory-count" aria-live="polite">{isLoading ? "Đang tải" : filtered.length + " nghệ sĩ"}</p>
      </div>
      {error ? <p className="memorial-section-empty">Không tải được trang. Vui lòng thử lại sau.</p> : groups.length ? groups.map((group) => <section key={group.label} className="memorial-decade" aria-label={group.label}>
        <h2>{group.decade === null ? group.label : "Thập niên " + group.label}</h2>
        <div className="memorial-directory-grid">{group.artists.map((artist) => <Link key={artist.id} className="memorial-name-link" to={"/" + (artist.slug || artist.id)}>
          <MemorialPortrait src={artist.avatar_url} name={artist.name} />
          <h3>{artist.name}</h3>
          <p>{formatLifespan(artist.birth_date, artist.death_date)}</p>
        </Link>)}</div>
      </section>) : !isLoading && <p className="memorial-section-empty">Không có nghệ sĩ nào khớp với lựa chọn này.</p>}
    </main>
    <MemorialFooter />
  </div>;
}
