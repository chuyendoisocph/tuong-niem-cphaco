import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { MemorialFooter, MemorialHeader, MemorialPortrait } from "@/components/memorial/MemorialLayout";
import { useAllMemorialItems, useArtists, type MemorialArtist, type MemorialItem } from "@/hooks/usePublicMemorial";
import { ART_FORMS, artFormOf, formatLifespan, formatLooseDate, parseLooseDate, parseName, restingPlaceName, workCaption } from "@/lib/memorial";
import { dayMonthQuery, graveArea, highlightParts, matchIndex, plainText, searchQuery, snippetAround, type SearchQuery } from "@/lib/search";
import { pageTitle } from "@/lib/site";
import { resetMetaTags, updateMetaTags } from "@/utils/metaTags";

type ResultKind = "artists" | "works" | "milestones" | "biographies";
type FilterKey = "linhvuc" | "nghe" | "danh" | "nam" | "khu";

const KIND_LABELS: Record<ResultKind, string> = {
  artists: "Nghệ sỹ, danh nhân",
  works: "Tác phẩm",
  milestones: "Mốc cuộc đời",
  biographies: "Trong tiểu sử",
};
const FILTER_KEYS: FilterKey[] = ["linhvuc", "nghe", "danh", "nam", "khu"];

const artistHref = (artist: MemorialArtist) => "/" + (artist.slug || artist.id);
const deathDecade = (artist: MemorialArtist) => {
  const year = parseLooseDate(artist.death_date)?.year;
  return year ? String(Math.floor(year / 10) * 10) : null;
};

function tally(values: (string | null)[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()];
}

function Highlight({ text, query }: { text: string; query: SearchQuery }) {
  return <>{highlightParts(text, query).map((part, index) => part.match ? <mark key={index}>{part.text}</mark> : part.text)}</>;
}

export default function MemorialSearch() {
  const [params, setParams] = useSearchParams();
  const rawQuery = params.get("q") ?? "";
  const kind = (params.get("loai") as ResultKind | null) ?? null;
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key)])) as Record<FilterKey, string | null>;
  const filtering = FILTER_KEYS.some((key) => filters[key]);
  const query = useMemo(() => searchQuery(rawQuery), [rawQuery]);
  const dayMonth = useMemo(() => dayMonthQuery(rawQuery), [rawQuery]);
  const year = /^\d{4}$/.test(query.text) ? Number(query.text) : null;
  const searching = !!query.text || filtering;
  const { data: artists = [], isLoading, error } = useArtists();
  const { data: items = [] } = useAllMemorialItems();

  useEffect(() => {
    updateMetaTags({
      title: pageTitle((rawQuery.trim() ? `${rawQuery.trim()} | ` : "") + "Tra cứu"),
      description: "Tra cứu nghệ sỹ, danh nhân, tác phẩm, mốc cuộc đời, ngày sinh, ngày mất và vị trí mộ của các nghệ sỹ và danh nhân an nghỉ tại Hoa Viên Bình Dương.",
      url: window.location.href,
    });
    return () => resetMetaTags();
  }, [rawQuery]);

  function update(changes: Partial<Record<FilterKey | "q" | "loai", string | null>>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value && value.trim()) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  }
  const setQuery = (text: string, nextKind: ResultKind | null = null) => update({ q: text, loai: nextKind });
  const clearFilters = () => update(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])));

  const artistsById = useMemo(() => new Map(artists.map((artist) => [artist.id, artist])), [artists]);
  const biographies = useMemo(() => new Map(artists.map((artist) => [artist.id, plainText(artist.biography)])), [artists]);

  // Filters narrow the people first; the typed query then searches within them.
  const pool = useMemo(() => artists.filter((artist) => {
    const { honorific, profession } = parseName(artist.name);
    return (!filters.linhvuc || artFormOf(artist) === filters.linhvuc)
      && (!filters.nghe || profession === filters.nghe)
      && (!filters.danh || honorific === filters.danh)
      && (!filters.nam || deathDecade(artist) === filters.nam)
      && (!filters.khu || graveArea(artist.grave_number) === filters.khu);
  }), [artists, filters.linhvuc, filters.nghe, filters.danh, filters.nam, filters.khu]);

  const results = useMemo(() => {
    const none = { artists: [] as MemorialArtist[], works: [] as MemorialItem[], milestones: [] as MemorialItem[], biographies: [] as { artist: MemorialArtist; snippet: string }[] };
    if (!searching) return none;
    if (!query.text) return { ...none, artists: pool };
    if (dayMonth) {
      const onDay = (value: string | null) => {
        const date = parseLooseDate(value);
        return !!date && !date.yearOnly && date.day === dayMonth.day && date.month === dayMonth.month;
      };
      return { ...none, artists: pool.filter((artist) => onDay(artist.birth_date) || onDay(artist.death_date)) };
    }
    const poolIds = new Set(pool.map((artist) => artist.id));
    const yearOf = (value: string | null) => parseLooseDate(value)?.year ?? null;
    const artistHits = pool.filter((artist) => year !== null
      ? yearOf(artist.birth_date) === year || yearOf(artist.death_date) === year
      : [artist.name, artist.tagline, restingPlaceName(artist), artist.resting_address, artist.grave_number]
        .some((field) => matchIndex(field, query) !== -1));
    const itemHits = (wanted: MemorialItem["kind"]) => items.filter((item) => item.kind === wanted && poolIds.has(item.profile_id)
      && (year !== null ? item.year === year || matchIndex(item.title, query) !== -1 : [item.title, item.description].some((field) => matchIndex(field, query) !== -1)));
    const biographyHits = pool.flatMap((artist) => {
      const snippet = snippetAround(biographies.get(artist.id) ?? "", query);
      return snippet ? [{ artist, snippet }] : [];
    });
    return { artists: artistHits, works: itemHits("work"), milestones: itemHits("milestone"), biographies: biographyHits };
  }, [biographies, dayMonth, items, pool, query, searching, year]);

  const counts = (Object.keys(KIND_LABELS) as ResultKind[]).map((key) => ({ key, count: results[key].length }));
  const total = counts.reduce((sum, { count }) => sum + count, 0);
  const show = (key: ResultKind) => results[key].length > 0 && (!kind || kind === key);

  const options = useMemo(() => {
    const names = artists.map((artist) => parseName(artist.name));
    return {
      linhvuc: tally(artists.map(artFormOf)).sort((left, right) => ART_FORMS.indexOf(left[0] as typeof ART_FORMS[number]) - ART_FORMS.indexOf(right[0] as typeof ART_FORMS[number])),
      nghe: tally(names.map((name) => name.profession)).sort((left, right) => right[1] - left[1]),
      danh: tally(names.map((name) => name.honorific)).sort((left, right) => right[1] - left[1]),
      nam: tally(artists.map(deathDecade)).sort((left, right) => Number(right[0]) - Number(left[0])),
      khu: tally(artists.map((artist) => graveArea(artist.grave_number))).sort((left, right) => left[0].localeCompare(right[0], "vi", { numeric: true })),
    };
  }, [artists]);
  const deathYears = useMemo(() => [...new Set(artists.map((artist) => parseLooseDate(artist.death_date)?.year).filter((value): value is number => !!value))].sort((left, right) => right - left), [artists]);
  const workKinds = useMemo(() => [...new Set(items.filter((item) => item.kind === "work" && item.description && !/^(Vở|Phim|Opera)\s+["“]/i.test(item.description)).map((item) => item.description as string))], [items]);
  const today = new Date();
  const todayQuery = `${today.getDate()}/${today.getMonth() + 1}`;

  function dateNote(artist: MemorialArtist): string | null {
    if (!dayMonth) return null;
    const notes = [["Sinh", artist.birth_date], ["Mất", artist.death_date]].flatMap(([label, value]) => {
      const date = parseLooseDate(value);
      return date && !date.yearOnly && date.day === dayMonth.day && date.month === dayMonth.month ? [`${label} ${formatLooseDate(date)}`] : [];
    });
    return notes.join(" · ") || null;
  }

  const filterLabels: Record<FilterKey, string> = { linhvuc: "Lĩnh vực", nghe: "Nghề", danh: "Danh hiệu", nam: "Năm mất", khu: "Khu mộ" };
  const areaLabel = (area: string) => /^[A-Z]\d/.test(area) ? `Khu ${area}` : area;
  const optionLabel = (key: FilterKey, value: string) => key === "nam" ? `${value} - ${Number(value) + 9}` : key === "khu" ? areaLabel(value) : value;

  return <div className="memorial">
    <MemorialHeader />
    <main className="memorial-shell">
      <div className="memorial-directory-head">
        <h1 className="memorial-display">Tra cứu</h1>
        <p className="memorial-prose memorial-places-lead">Tìm theo tên, tác phẩm, vai diễn, năm sinh hoặc năm mất, một ngày trong năm như “22/10”, số mộ hay một chi tiết trong tiểu sử.</p>
        <form className="memorial-search-field memorial-research-field" role="search" onSubmit={(event) => event.preventDefault()}>
          <Search size={22} aria-hidden="true" />
          <input type="search" autoFocus aria-label="Nội dung tra cứu" placeholder="Ví dụ: cải lương, 1975, 22/10, B1.2.2" value={rawQuery} onChange={(event) => setQuery(event.target.value, kind)} />
        </form>
        {artists.length > 0 && <div className="memorial-research-filters" role="group" aria-label="Lọc nghệ sỹ và danh nhân">
          {FILTER_KEYS.filter((key) => options[key].length > 1).map((key) => <label key={key}>
            <span>{filterLabels[key]}</span>
            <select value={filters[key] ?? ""} onChange={(event) => update({ [key]: event.target.value || null })}>
              <option value="">Tất cả</option>
              {options[key].map(([value, count]) => <option key={value} value={value}>{optionLabel(key, value)} ({count})</option>)}
            </select>
          </label>)}
          {filtering && <button type="button" className="memorial-text-link" onClick={clearFilters}>Bỏ lọc</button>}
        </div>}
        {query.text && total > 0 && !dayMonth && <div className="memorial-filters" role="group" aria-label="Loại kết quả">
          <button type="button" className="memorial-filter" aria-pressed={!kind} onClick={() => update({ loai: null })}>Tất cả · {total}</button>
          {counts.filter(({ count }) => count > 0).map(({ key, count }) => <button key={key} type="button" className="memorial-filter" aria-pressed={kind === key} onClick={() => update({ loai: key })}>{KIND_LABELS[key]} · {count}</button>)}
        </div>}
        <p className="memorial-directory-count" aria-live="polite">{isLoading ? "Đang tải"
          : !searching ? `${artists.length} người · ${items.filter((item) => item.kind === "work").length} tác phẩm · ${items.filter((item) => item.kind === "milestone").length} mốc cuộc đời`
          : !query.text ? `${pool.length} người phù hợp`
          : dayMonth ? (total ? `${total} người sinh hoặc mất ngày ${dayMonth.day}/${dayMonth.month}` : `Chưa có ai sinh hoặc mất ngày ${dayMonth.day}/${dayMonth.month}`)
          : total ? `${total} kết quả cho “${rawQuery.trim()}”` : `Không có kết quả cho “${rawQuery.trim()}”`}</p>
      </div>

      {error && <p className="memorial-section-empty">Không tải được dữ liệu. Vui lòng thử lại sau.</p>}

      {!searching && !isLoading && <div className="memorial-research-browse">
        <section aria-labelledby="browse-day"><h2 id="browse-day">Theo ngày</h2><div className="memorial-research-chips"><button type="button" onClick={() => setQuery(todayQuery)}>Hôm nay, {todayQuery}</button></div></section>
        {options.linhvuc.length > 0 && <section aria-labelledby="browse-form"><h2 id="browse-form">Theo lĩnh vực</h2><div className="memorial-research-chips">{options.linhvuc.map(([label, count]) => <button key={label} type="button" onClick={() => update({ linhvuc: label })}>{label}<small>{count}</small></button>)}</div></section>}
        {options.nghe.length > 0 && <section aria-labelledby="browse-profession"><h2 id="browse-profession">Theo nghề và danh hiệu</h2><div className="memorial-research-chips">
          {options.nghe.map(([label, count]) => <button key={label} type="button" onClick={() => update({ nghe: label })}>{label}<small>{count}</small></button>)}
          {options.danh.map(([label, count]) => <button key={label} type="button" onClick={() => update({ danh: label })}>{label}<small>{count}</small></button>)}
        </div></section>}
        {workKinds.length > 0 && <section aria-labelledby="browse-kind"><h2 id="browse-kind">Theo loại tác phẩm</h2><div className="memorial-research-chips">{workKinds.map((label) => <button key={label} type="button" onClick={() => setQuery(label, "works")}>{label}</button>)}</div></section>}
        {deathYears.length > 0 && <section aria-labelledby="browse-year"><h2 id="browse-year">Theo năm mất</h2><div className="memorial-research-chips">{deathYears.map((value) => <button key={value} type="button" onClick={() => setQuery(String(value))}>{value}</button>)}</div></section>}
        {options.khu.length > 0 && <section aria-labelledby="browse-area"><h2 id="browse-area">Theo khu mộ</h2><div className="memorial-research-chips">{options.khu.map(([area, count]) => <button key={area} type="button" onClick={() => update({ khu: area })}>{areaLabel(area)}<small>{count}</small></button>)}</div><Link className="memorial-text-link" to="/noi-an-nghi">Xem bảng nơi an nghỉ đầy đủ</Link></section>}
      </div>}

      {searching && !isLoading && total === 0 && <div className="memorial-section-empty">
        <p>{dayMonth ? "Thử một ngày khác, hoặc xem các tháng có ngày tưởng nhớ ở trang chủ." : filtering ? "Thử bỏ bớt bộ lọc, gõ không dấu hoặc gõ ngắn hơn." : "Thử gõ không dấu, gõ ngắn hơn, hoặc tìm theo năm như “1975”."}</p>
      </div>}

      {show("artists") && <section className="memorial-search-group" aria-labelledby="result-artists">
        <div className="memorial-search-group-head">
          <h2 id="result-artists">Nghệ sỹ, danh nhân <small>{results.artists.length}</small></h2>
        </div>
        <ul>{results.artists.map((artist) => {
          const note = dateNote(artist);
          return <li key={artist.id}><Link className="memorial-search-artist memorial-name-link" to={artistHref(artist)}>
            <MemorialPortrait src={artist.avatar_url} name={artist.name} />
            <span>
              <strong><Highlight text={artist.name} query={query} /></strong>
              <small>{note ?? formatLifespan(artist.birth_date, artist.death_date)} · <Highlight text={restingPlaceName(artist)} query={query} />{artist.grave_number && <> · Số mộ <Highlight text={artist.grave_number} query={query} /></>}</small>
              {artist.tagline && <em><Highlight text={artist.tagline} query={query} /></em>}
            </span>
          </Link></li>;
        })}</ul>
      </section>}

      {show("works") && <section className="memorial-search-group" aria-labelledby="result-works">
        <h2 id="result-works">Tác phẩm <small>{results.works.length}</small></h2>
        <ul>{results.works.map((work) => {
          const artist = artistsById.get(work.profile_id) as MemorialArtist;
          return <li key={work.id}><Link className="memorial-search-line memorial-name-link" to={artistHref(artist) + "#dau-an"}>
            <strong><Highlight text={work.title} query={query} /></strong>
            <small><Highlight text={[workCaption(work), artist.name].filter(Boolean).join(" · ")} query={query} /></small>
          </Link></li>;
        })}</ul>
      </section>}

      {show("milestones") && <section className="memorial-search-group" aria-labelledby="result-milestones">
        <h2 id="result-milestones">Mốc cuộc đời <small>{results.milestones.length}</small></h2>
        <ul>{results.milestones.map((item) => {
          const artist = artistsById.get(item.profile_id) as MemorialArtist;
          return <li key={item.id}><Link className="memorial-search-line memorial-search-milestone memorial-name-link" to={artistHref(artist) + "#cuoc-doi"}>
            <span className="memorial-mono">{item.year ?? ""}</span>
            <span><strong><Highlight text={item.title} query={query} /></strong><small>{artist.name}</small></span>
          </Link></li>;
        })}</ul>
      </section>}

      {show("biographies") && <section className="memorial-search-group" aria-labelledby="result-biographies">
        <h2 id="result-biographies">Trong tiểu sử <small>{results.biographies.length}</small></h2>
        <ul>{results.biographies.map(({ artist, snippet }) => <li key={artist.id}><Link className="memorial-search-line memorial-name-link" to={artistHref(artist) + "#cuoc-doi"}>
          <strong>{artist.name}</strong>
          <p><Highlight text={snippet} query={query} /></p>
        </Link></li>)}</ul>
      </section>}
    </main>
    <MemorialFooter />
  </div>;
}
