import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation, Search } from "lucide-react";
import { MemorialFooter, MemorialHeader, MemorialPortrait } from "@/components/memorial/MemorialLayout";
import { useArtists, type MemorialArtist } from "@/hooks/usePublicMemorial";
import { ARTISTS_ROW_PLACE, directionsUrl, foldVietnamese, formatLifespan, graveMapUrl, restingFacts, restingPlaceName } from "@/lib/memorial";
import { pageTitle } from "@/lib/site";
import { resetMetaTags, updateMetaTags } from "@/utils/metaTags";

type Scope = "all" | "hoa-vien" | "elsewhere";

const SCOPES: { id: Scope; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "hoa-vien", label: "Tại Hoa Viên Bình Dương" },
  { id: "elsewhere", label: "Nơi khác" },
];

const artistHref = (artist: MemorialArtist) => "/" + (artist.slug || artist.id);

function groupByPlace(artists: MemorialArtist[]): { place: string; artists: MemorialArtist[] }[] {
  const groups = new Map<string, MemorialArtist[]>();
  for (const artist of artists) {
    const place = restingPlaceName(artist);
    groups.set(place, [...(groups.get(place) ?? []), artist]);
  }
  return [...groups.entries()]
    .map(([place, members]) => ({ place, artists: members.sort((left, right) => left.name.localeCompare(right.name, "vi")) }))
    .sort((left, right) => Number(right.artists[0].in_hoa_vien) - Number(left.artists[0].in_hoa_vien)
      || Number(right.place === ARTISTS_ROW_PLACE) - Number(left.place === ARTISTS_ROW_PLACE) || left.place.localeCompare(right.place, "vi"));
}

export default function MemorialRestingPlaces() {
  const { data: artists = [], isLoading, error } = useArtists();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  useEffect(() => {
    updateMetaTags({
      title: pageTitle("Nơi an nghỉ"),
      description: "Vị trí mộ và đường đi tới nơi an nghỉ của các nghệ sỹ và danh nhân tại Hoa Viên Bình Dương.",
      url: window.location.href,
    });
    return () => resetMetaTags();
  }, []);

  const query = foldVietnamese(search.trim());
  const filtered = artists.filter((artist) =>
    (scope === "all" || (scope === "hoa-vien") === artist.in_hoa_vien)
    && (!query || foldVietnamese([artist.name, restingPlaceName(artist), artist.resting_address ?? ""].join(" ")).includes(query)));
  const groups = groupByPlace(filtered);
  const elsewhereCount = artists.filter((artist) => !artist.in_hoa_vien).length;

  return <div className="memorial">
    <MemorialHeader />
    <main className="memorial-shell">
      <div className="memorial-directory-head">
        <h1 className="memorial-display">Nơi an nghỉ</h1>
        <p className="memorial-prose memorial-places-lead">{elsewhereCount > 0 ? "Địa chỉ, vị trí mộ và đường đi tới nơi an nghỉ của các nghệ sỹ và danh nhân, trong và ngoài Hoa Viên Bình Dương." : "Vị trí mộ và đường đi tới nơi an nghỉ của các nghệ sỹ và danh nhân tại Hoa Viên Bình Dương."}</p>
        <label className="memorial-search-field"><Search size={20} aria-hidden="true" /><input type="search" aria-label="Tìm theo tên hoặc nơi an nghỉ" placeholder="Tìm theo tên hoặc nơi an nghỉ" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        {elsewhereCount > 0 && <div className="memorial-filters" role="group" aria-label="Lọc theo nơi an nghỉ">
          {SCOPES.map((option) => <button key={option.id} type="button" className="memorial-filter" aria-pressed={scope === option.id} onClick={() => setScope(option.id)}>{option.label}</button>)}
        </div>}
        <p className="memorial-directory-count" aria-live="polite">{isLoading ? "Đang tải" : `${filtered.length} người · ${groups.length} nơi an nghỉ`}</p>
      </div>

      {error ? <p className="memorial-section-empty">Không tải được trang. Vui lòng thử lại sau.</p>
        : groups.length ? groups.map((group) => <section key={group.place} className="memorial-place-group" aria-label={group.place}>
          <div className="memorial-place-group-head">
            <h2>{group.place}</h2>
            {group.artists[0]?.resting_address && group.artists.every((artist) => artist.resting_address === group.artists[0].resting_address) && <p>{group.artists[0].resting_address}</p>}
          </div>
          <ul className="memorial-place-list">{group.artists.map((artist) => {
            const directions = directionsUrl(artist);
            const graveMap = graveMapUrl(artist);
            const facts = restingFacts(artist);
            const sharedAddress = group.artists.every((other) => other.resting_address === artist.resting_address);
            return <li key={artist.id} className="memorial-place-row">
              <Link className="memorial-place-person memorial-name-link" to={artistHref(artist)}>
                <MemorialPortrait src={artist.avatar_url} name={artist.name} />
                <span><strong>{artist.name}</strong><small>{formatLifespan(artist.birth_date, artist.death_date)}</small></span>
              </Link>
              <div className="memorial-place-detail">
                {!sharedAddress && artist.resting_address && <p>{artist.resting_address}</p>}
                {facts.length > 0 ? <dl>{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : <p className="memorial-place-missing">Chưa có vị trí mộ chi tiết.</p>}
              </div>
              {graveMap ? <a className="memorial-place-directions" href={graveMap} target="_blank" rel="noopener noreferrer" aria-label={`Xem vị trí mộ của ${artist.name} trên bản đồ số`}><Navigation size={17} aria-hidden="true" />Xem vị trí mộ</a>
                : directions && <a className="memorial-place-directions" href={directions} target="_blank" rel="noopener noreferrer" aria-label={`Chỉ đường tới nơi an nghỉ của ${artist.name}`}><Navigation size={17} aria-hidden="true" />Chỉ đường</a>}
            </li>;
          })}</ul>
        </section>)
        : !isLoading && <p className="memorial-section-empty">Không có ai hay nơi an nghỉ nào khớp với lựa chọn này.</p>}
    </main>
    <MemorialFooter />
  </div>;
}
