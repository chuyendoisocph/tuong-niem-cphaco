import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, ImagePlus, X } from "lucide-react";
import { uploadPortrait, useQuickSaveProfile, type AdminProfile, type ItemCounts } from "@/admin/adminData";
import { gapLabel, type Gap } from "@/admin/completeness";
import { dateToInput, emptyToNull, inputToDate } from "@/admin/format";
import { hiddenReason } from "@/hooks/usePublicMemorial";
import { initialOf } from "@/lib/memorial";

type Form = { grave_number: string; resting_place: string; death: string; tagline: string; avatar_url: string; is_published: boolean };

const toForm = (profile: AdminProfile): Form => ({
  grave_number: profile.grave_number ?? "", resting_place: profile.resting_place ?? "", death: dateToInput(profile.death_date),
  tagline: profile.tagline ?? "", avatar_url: profile.avatar_url ?? "", is_published: profile.is_published,
});

// Like Home Assistant's more-info dialog: open a tile, fix the common gaps, close; the full editor is one link away.
export default function QuickEdit({ profile, gaps, counts, onClose }: { profile: AdminProfile | null; gaps: Gap[]; counts?: ItemCounts; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const save = useQuickSaveProfile();
  const [form, setForm] = useState<Form | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  // A new person resets the form; the same person refreshed after saving keeps the "Đã lưu" note.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (profile) {
      setForm(toForm(profile));
      setMessage(null);
      if (!element.open) element.showModal();
    } else if (element.open) element.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const death = inputToDate(form?.death ?? "");
  const set = <K extends keyof Form>(key: K, value: Form[K]) => { setForm((current) => current && { ...current, [key]: value }); setMessage(null); };

  async function choosePortrait(file: File | undefined) {
    if (!file || !profile) return;
    setUploading(true);
    try {
      set("avatar_url", await uploadPortrait(file, profile.slug ?? ""));
    } catch {
      setMessage({ kind: "error", text: "Chưa tải được ảnh." });
    }
    setUploading(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !form) return;
    if (!death.valid) return setMessage({ kind: "error", text: "Ngày mất ghi dạng 22/12/2020 hoặc chỉ năm." });
    try {
      await save.mutateAsync({
        profile,
        changes: {
          grave_number: profile.in_hoa_vien ? emptyToNull(form.grave_number) : profile.grave_number,
          resting_place: emptyToNull(form.resting_place),
          death_date: death.value,
          tagline: emptyToNull(form.tagline),
          avatar_url: emptyToNull(form.avatar_url),
          is_published: form.is_published,
        },
      });
      setMessage({ kind: "ok", text: "Đã lưu." });
    } catch {
      setMessage({ kind: "error", text: "Chưa lưu được. Xin thử lại." });
    }
  }

  const reason = profile && form ? hiddenReason({ ...profile, avatar_url: form.avatar_url, tagline: form.tagline, is_published: form.is_published }) : null;

  return <dialog ref={dialog} className="dash-dialog" aria-labelledby="quick-edit-title" onClose={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    {profile && form && <form onSubmit={submit}>
      <header>
        {form.avatar_url ? <img src={form.avatar_url} alt="" /> : <span className="dash-tile-initial" aria-hidden="true">{initialOf(profile.name)}</span>}
        <div>
          <h2 id="quick-edit-title">{profile.name}</h2>
          <p className={reason ? "admin-status is-hidden" : "admin-status is-shown"}>{reason ?? "Đang hiện trên trang"}</p>
        </div>
        <button type="button" className="admin-icon-button" aria-label="Đóng" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </header>

      {gaps.length > 0 && <p className="dash-dialog-gaps">Còn thiếu: {gaps.map(gapLabel).map((label) => label.replace("Thiếu ", "")).join(", ")}.</p>}

      <div className="dash-dialog-fields">
        <div className="admin-actions">
          <button type="button" className="admin-button admin-button-quiet admin-button-small" disabled={uploading} onClick={() => fileInput.current?.click()}><ImagePlus size={15} aria-hidden="true" />{uploading ? "Đang tải ảnh" : form.avatar_url ? "Thay ảnh" : "Tải ảnh chân dung"}</button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(event) => { void choosePortrait(event.target.files?.[0]); event.target.value = ""; }} />
        </div>
        {profile.in_hoa_vien && <label>Số mộ<input value={form.grave_number} placeholder="Ví dụ B1.2.2-11-03" onChange={(event) => set("grave_number", event.target.value)} /></label>}
        <label>{profile.in_hoa_vien ? "Vị trí trong Hoa Viên (để trống nếu ở Đường Nghệ Sỹ)" : "Nơi an nghỉ"}<input value={form.resting_place} onChange={(event) => set("resting_place", event.target.value)} /></label>
        <label>Ngày mất<input inputMode="numeric" value={form.death} placeholder="22/12/2020" aria-invalid={!death.valid} onChange={(event) => set("death", event.target.value)} /></label>
        <label>Câu giới thiệu<input maxLength={140} value={form.tagline} onChange={(event) => set("tagline", event.target.value)} /></label>
        <label className="admin-check"><input type="checkbox" checked={form.is_published} onChange={(event) => set("is_published", event.target.checked)} />Hiện trên trang</label>
        {counts && <p className="admin-hint">{counts.works} tác phẩm · {counts.milestones} mốc cuộc đời. Thêm ở trang sửa đầy đủ.</p>}
      </div>

      <footer>
        {message && <p className={message.kind === "ok" ? "admin-ok" : "admin-error"} role="status">{message.text}</p>}
        <Link className="admin-link" to={`/quan-tri/ho-so/${profile.id}`}>Sửa đầy đủ</Link>
        {profile.slug && <a className="admin-link" href={`/${profile.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />Xem trang</a>}
        <button type="submit" className="admin-button" disabled={save.isPending || uploading}>{save.isPending ? "Đang lưu" : "Lưu"}</button>
      </footer>
    </form>}
  </dialog>;
}
