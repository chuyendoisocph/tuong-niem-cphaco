import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useAdminItems, useDeleteItem, useReorderItems, useSaveItem, type AdminItem } from "@/admin/adminData";
import { emptyToNull } from "@/admin/format";
import { publicHttpUrl, youtubeId } from "@/lib/memorial";

type Draft = { year: string; title: string; description: string; url: string; excerpt: string };
const toDraft = (item?: AdminItem): Draft => ({ year: item?.year?.toString() ?? "", title: item?.title ?? "", description: item?.description ?? "", url: item?.url ?? "", excerpt: item?.excerpt ?? "" });
const EXCERPT_LIMIT = 1200;
const yearValid = (year: string) => !year.trim() || /^\d{3,4}$/.test(year.trim());

function ItemRow({ item, kind, onSave, onDelete, onMove, first, last, busy }: {
  item?: AdminItem;
  kind: AdminItem["kind"];
  onSave: (draft: Draft) => Promise<void>;
  onDelete?: () => void;
  onMove?: (step: -1 | 1) => void;
  first?: boolean;
  last?: boolean;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(toDraft(item));
  const [error, setError] = useState<string | null>(null);
  const [showExcerpt, setShowExcerpt] = useState(!!item?.excerpt);
  useEffect(() => setDraft(toDraft(item)), [item]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(item));
  const set = (key: keyof Draft, value: string) => { setDraft((current) => ({ ...current, [key]: value })); setError(null); };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) return setError("Xin nhập tên.");
    if (!yearValid(draft.year)) return setError("Năm ghi 4 chữ số.");
    if (draft.url.trim() && !publicHttpUrl(draft.url.trim())) return setError("Link cần bắt đầu bằng https://");
    try {
      await onSave(draft);
      if (!item) { setDraft(toDraft()); setShowExcerpt(false); }
    } catch {
      setError("Chưa lưu được.");
    }
  }

  return <form className="admin-item" data-new={!item} onSubmit={submit} noValidate>
    <input aria-label="Năm" className="admin-item-year" inputMode="numeric" placeholder="Năm" value={draft.year} onChange={(event) => set("year", event.target.value)} />
    <input aria-label="Tên" placeholder={kind === "work" ? "Tên tác phẩm hoặc vai diễn" : "Sự kiện, ví dụ “Được phong NSND”"} value={draft.title} onChange={(event) => set("title", event.target.value)} />
    <input aria-label="Mô tả" placeholder={kind === "work" ? "Loại, ví dụ “Ca khúc” hoặc Vở “Tên vở”" : "Mô tả thêm (không bắt buộc)"} value={draft.description} onChange={(event) => set("description", event.target.value)} />
    {kind === "work" && <input aria-label="Link nghe, xem, đọc" type="url" placeholder="Link YouTube hoặc trang đọc" value={draft.url} onChange={(event) => set("url", event.target.value)} />}
    <div className="admin-item-actions">
      {item ? <>
        {dirty && <button type="submit" className="admin-button admin-button-small" disabled={busy}>Lưu</button>}
        <button type="button" aria-label="Lên trên" disabled={first || busy} onClick={() => onMove?.(-1)}><ArrowUp size={16} aria-hidden="true" /></button>
        <button type="button" aria-label="Xuống dưới" disabled={last || busy} onClick={() => onMove?.(1)}><ArrowDown size={16} aria-hidden="true" /></button>
        <button type="button" aria-label="Xóa" disabled={busy} onClick={onDelete}><Trash2 size={16} aria-hidden="true" /></button>
      </> : <button type="submit" className="admin-button admin-button-small" disabled={busy}><Plus size={15} aria-hidden="true" />Thêm</button>}
    </div>
    {kind === "work" && <div className="admin-item-extra">
      {draft.url.trim() && <p className="admin-hint">{youtubeId(draft.url) ? "Video YouTube: phát ngay trên trang." : "Link ngoài: trang hiện nút mở link."}</p>}
      {showExcerpt ? <label>Trích đoạn <small>(vài câu thơ hoặc một đoạn văn ngắn, giữ xuống dòng; ghi đúng nguyên văn) {draft.excerpt.length}/{EXCERPT_LIMIT}</small>
        <textarea rows={4} maxLength={EXCERPT_LIMIT} value={draft.excerpt} onChange={(event) => set("excerpt", event.target.value)} />
      </label> : <button type="button" className="admin-link" onClick={() => setShowExcerpt(true)}><Plus size={14} aria-hidden="true" />Thêm trích đoạn</button>}
    </div>}
    {error && <p className="admin-error admin-item-error">{error}</p>}
  </form>;
}

export default function ItemsEditor({ profileId, kind, title }: { profileId: string; kind: AdminItem["kind"]; title: string }) {
  const { data = [] } = useAdminItems(profileId);
  const items = data.filter((item) => item.kind === kind);
  const saveItem = useSaveItem(profileId);
  const deleteItem = useDeleteItem(profileId);
  const reorder = useReorderItems(profileId);
  const busy = saveItem.isPending || deleteItem.isPending || reorder.isPending;

  const save = (item?: AdminItem) => async (draft: Draft) => {
    await saveItem.mutateAsync({
      id: item?.id, profile_id: profileId, kind, title: draft.title.trim(), description: emptyToNull(draft.description),
      year: draft.year.trim() ? Number(draft.year) : null, url: kind === "work" ? emptyToNull(draft.url) : null,
      excerpt: kind === "work" && draft.excerpt.trim() ? draft.excerpt.replace(/\s+$/, "") : null,
      display_order: item?.display_order ?? items.length,
    });
  };

  function move(index: number, step: -1 | 1) {
    const next = [...items];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    reorder.mutate(next);
  }

  return <section className="admin-card">
    <h2>{title} <small>{items.length}</small></h2>
    {kind === "milestone" && <p className="admin-hint">Trang hiện dòng thời gian khi có từ 2 mốc trở lên.</p>}
    {kind === "work" && <p className="admin-hint">Mục đầu tiên là tác phẩm tiêu biểu nhất. Vai diễn ghi mô tả dạng Vở “Tên vở” hoặc Phim “Tên phim”.</p>}
    <div className="admin-items">
      {items.map((item, index) => <ItemRow key={item.id} item={item} kind={kind} busy={busy} first={index === 0} last={index === items.length - 1}
        onSave={save(item)} onMove={(step) => move(index, step)}
        onDelete={() => { if (window.confirm(`Xóa “${item.title}”?`)) deleteItem.mutate(item.id); }} />)}
      <ItemRow kind={kind} busy={busy} onSave={save()} />
    </div>
  </section>;
}
