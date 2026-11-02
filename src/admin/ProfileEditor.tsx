import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import { uploadPortrait, useAdminProfile, useSaveProfile, type AdminProfile, type ProfileDraft } from "@/admin/adminData";
import { biographyToText, dateToInput, emptyToNull, inputToDate, slugify, textToBiography } from "@/admin/format";
import ItemsEditor from "@/admin/ItemsEditor";
import ArchivePhotos from "@/admin/ArchivePhotos";
import { hiddenReason } from "@/hooks/usePublicMemorial";
import { fieldOf, initialOf, parseName, publicHttpUrl } from "@/lib/memorial";

type Form = {
  name: string;
  slug: string;
  birth: string;
  death: string;
  tagline: string;
  biography: string;
  avatar_url: string;
  is_published: boolean;
  in_hoa_vien: boolean;
  grave_number: string;
  grave_area: string;
  grave_lot: string;
  resting_place: string;
  resting_address: string;
  latitude: string;
  longitude: string;
  maps_url: string;
  sources: string;
};

const EMPTY: Form = {
  name: "", slug: "", birth: "", death: "", tagline: "", biography: "", avatar_url: "", is_published: true, in_hoa_vien: true,
  grave_number: "", grave_area: "", grave_lot: "", resting_place: "", resting_address: "", latitude: "", longitude: "", maps_url: "", sources: "",
};

function toForm(profile: AdminProfile): Form {
  const text = (value: string | null) => value ?? "";
  return {
    name: profile.name, slug: text(profile.slug), birth: dateToInput(profile.birth_date), death: dateToInput(profile.death_date),
    tagline: text(profile.tagline), biography: biographyToText(profile.biography), avatar_url: text(profile.avatar_url),
    is_published: profile.is_published, in_hoa_vien: profile.in_hoa_vien, grave_number: text(profile.grave_number),
    grave_area: text(profile.grave_area), grave_lot: text(profile.grave_lot), resting_place: text(profile.resting_place),
    resting_address: text(profile.resting_address), latitude: profile.latitude?.toString() ?? "", longitude: profile.longitude?.toString() ?? "",
    maps_url: text(profile.maps_url),
    sources: (profile.sources ?? []).map((source) => `${source.title} | ${source.url}`).join("\n"),
  };
}

function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: (id: string) => ReactNode }) {
  const id = useId();
  return <div className="admin-field">
    <label htmlFor={id}>{label}</label>
    {children(id)}
    {error ? <p className="admin-error">{error}</p> : hint ? <p className="admin-hint">{hint}</p> : null}
  </div>;
}

export default function ProfileEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useAdminProfile(id);
  const saveProfile = useSaveProfile();
  const [form, setForm] = useState<Form>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setForm(toForm(profile));
      setDirty(false);
      setSlugTouched(true);
    }
  }, [profile]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const parsed = parseName(form.name);
  const field = form.name.trim() ? fieldOf(form.name) : null;
  const birth = inputToDate(form.birth);
  const death = inputToDate(form.death);
  const latitude = form.latitude.trim() ? Number(form.latitude.replace(",", ".")) : null;
  const longitude = form.longitude.trim() ? Number(form.longitude.replace(",", ".")) : null;
  const coordinatesValid = (latitude === null || (Number.isFinite(latitude) && Math.abs(latitude) <= 90))
    && (longitude === null || (Number.isFinite(longitude) && Math.abs(longitude) <= 180));
  const slug = slugify(form.slug);
  const reason = hiddenReason({ avatar_url: form.avatar_url, biography: form.biography, tagline: form.tagline, in_hoa_vien: form.in_hoa_vien, is_published: form.is_published });

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(parseName(String(value)).shortName);
      return next;
    });
    setDirty(true);
    setMessage(null);
  }

  async function choosePortrait(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      update("avatar_url", await uploadPortrait(file, slug));
    } catch {
      setMessage({ kind: "error", text: "Chưa tải được ảnh. Xin chọn ảnh JPG hoặc PNG dưới 20 MB." });
    }
    setUploading(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !slug || !birth.valid || !death.valid || !coordinatesValid) {
      setMessage({ kind: "error", text: "Xin kiểm tra lại các ô báo đỏ." });
      return;
    }
    const sourceLines = form.sources.split("\n").flatMap((line) => {
      const separator = line.lastIndexOf("|");
      const title = line.slice(0, separator).trim();
      const url = line.slice(separator + 1).trim();
      return separator > 0 && title && publicHttpUrl(url) ? [{ title, url }] : [];
    });
    const draft: ProfileDraft = {
      name: form.name.trim(), slug, birth_date: birth.value, death_date: death.value,
      tagline: emptyToNull(form.tagline), biography: textToBiography(form.biography), avatar_url: emptyToNull(form.avatar_url),
      is_published: form.is_published, in_hoa_vien: form.in_hoa_vien,
      grave_number: form.in_hoa_vien ? emptyToNull(form.grave_number) : null,
      grave_area: form.in_hoa_vien ? emptyToNull(form.grave_area) : null,
      grave_lot: form.in_hoa_vien ? emptyToNull(form.grave_lot) : null,
      resting_place: emptyToNull(form.resting_place),
      resting_address: form.in_hoa_vien ? null : emptyToNull(form.resting_address),
      latitude, longitude, maps_url: emptyToNull(form.maps_url), sources: sourceLines.length ? sourceLines : null,
    };
    try {
      const savedId = await saveProfile.mutateAsync({ id: id ?? null, draft });
      setDirty(false);
      setMessage({ kind: "ok", text: "Đã lưu." });
      if (!id) navigate(`/quan-tri/ho-so/${savedId}`, { replace: true });
    } catch (error) {
      const code = (error as { code?: string }).code;
      setMessage({ kind: "error", text: code === "23505" ? "Đường dẫn này đã có hồ sơ khác dùng. Xin đổi đường dẫn." : "Chưa lưu được. Xin thử lại." });
    }
  }

  if (id && isLoading) return <p className="admin-muted">Đang tải…</p>;
  if (id && !profile) return <p className="admin-error">Không tìm thấy hồ sơ này.</p>;

  return <>
    <div className="admin-page-head">
      <div>
        <Link to="/quan-tri/ho-so" className="admin-link"><ArrowLeft size={15} aria-hidden="true" />Tất cả hồ sơ</Link>
        <h1>{id ? profile?.name : "Thêm hồ sơ"}</h1>
      </div>
      {id && profile?.slug && <a className="admin-button admin-button-quiet" href={`/${profile.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" />Xem trang</a>}
    </div>

    <form className="admin-form" onSubmit={submit} noValidate>
      <section className="admin-card">
        <h2>Thông tin</h2>
        <Field label="Họ tên đầy đủ" error={!form.name.trim() && dirty ? "Xin nhập họ tên." : null}
          hint={form.name.trim() ? <>Danh hiệu: <b>{parsed.honorific ?? "không"}</b> · Nghề: <b>{parsed.profession ?? "không rõ"}</b> · Tên: <b>{parsed.shortName}</b> · Lĩnh vực: <b>{field ?? "không rõ"}</b></> : "Ghi danh hiệu và nghề ở đầu tên, ví dụ “NSND Nhạc sĩ Viễn Châu”, “Doanh nhân Nguyễn Văn A”."}>
          {(fieldId) => <input id={fieldId} value={form.name} onChange={(event) => update("name", event.target.value)} />}
        </Field>
        <Field label="Đường dẫn" error={!slug && dirty ? "Xin nhập đường dẫn." : null} hint={`Trang sẽ ở địa chỉ /${slug || "…"}`}>
          {(fieldId) => <input id={fieldId} value={form.slug} onChange={(event) => { setSlugTouched(true); update("slug", event.target.value); }} />}
        </Field>
        <div className="admin-row">
          <Field label="Ngày sinh" error={birth.valid ? null : "Ghi theo dạng 27/12/1926 hoặc chỉ năm 1926."} hint="Ngày/tháng/năm, hoặc chỉ năm.">
            {(fieldId) => <input id={fieldId} inputMode="numeric" value={form.birth} onChange={(event) => update("birth", event.target.value)} />}
          </Field>
          <Field label="Ngày mất" error={death.valid ? null : "Ghi theo dạng 22/12/2020 hoặc chỉ năm 2020."} hint="Ngày giỗ chỉ hiện khi có đủ ngày và tháng.">
            {(fieldId) => <input id={fieldId} inputMode="numeric" value={form.death} onChange={(event) => update("death", event.target.value)} />}
          </Field>
        </div>
        <Field label="Câu giới thiệu" hint={`Một dòng ngắn hiện dưới tên, ví dụ “Tác giả Kiếp nghèo”. ${form.tagline.length}/140`}>
          {(fieldId) => <input id={fieldId} maxLength={140} value={form.tagline} onChange={(event) => update("tagline", event.target.value)} />}
        </Field>
        <Field label="Tiểu sử" hint="Mỗi đoạn cách nhau một dòng trống.">
          {(fieldId) => <textarea id={fieldId} rows={12} value={form.biography} onChange={(event) => update("biography", event.target.value)} />}
        </Field>
      </section>

      <section className="admin-card">
        <h2>Ảnh chân dung</h2>
        <div className="admin-portrait">
          <div className="admin-portrait-frame">{form.avatar_url ? <img src={form.avatar_url} alt="Ảnh chân dung" /> : <span aria-hidden="true">{initialOf(form.name || "?")}</span>}</div>
          <div>
            <div className="admin-actions">
              <button type="button" className="admin-button admin-button-quiet" disabled={uploading} onClick={() => fileInput.current?.click()}><ImagePlus size={16} aria-hidden="true" />{uploading ? "Đang tải ảnh" : form.avatar_url ? "Thay ảnh" : "Tải ảnh lên"}</button>
              {form.avatar_url && <button type="button" className="admin-button admin-button-quiet" onClick={() => update("avatar_url", "")}><Trash2 size={16} aria-hidden="true" />Bỏ ảnh</button>}
            </div>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(event) => { void choosePortrait(event.target.files?.[0]); event.target.value = ""; }} />
            <Field label="Hoặc dán đường dẫn ảnh" hint="Ảnh được thu nhỏ còn 1600px khi tải lên. Chưa có ảnh thì trang hiện chữ cái đầu của tên.">
              {(fieldId) => <input id={fieldId} type="url" value={form.avatar_url} onChange={(event) => update("avatar_url", event.target.value)} />}
            </Field>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <h2>Nơi an nghỉ</h2>
        <div className="admin-segments" role="radiogroup" aria-label="Nơi an nghỉ">
          <button type="button" role="radio" aria-checked={form.in_hoa_vien} aria-pressed={form.in_hoa_vien} onClick={() => update("in_hoa_vien", true)}>Tại Hoa Viên Bình Dương</button>
          <button type="button" role="radio" aria-checked={!form.in_hoa_vien} aria-pressed={!form.in_hoa_vien} onClick={() => update("in_hoa_vien", false)}>Nơi khác</button>
        </div>
        {form.in_hoa_vien ? <>
          <div className="admin-row">
            <Field label="Mã vị trí mộ" hint="Ví dụ B1.2.2-11-03">{(fieldId) => <input id={fieldId} value={form.grave_number} onChange={(event) => update("grave_number", event.target.value)} />}</Field>
            <Field label="Khu">{(fieldId) => <input id={fieldId} value={form.grave_area} onChange={(event) => update("grave_area", event.target.value)} />}</Field>
            <Field label="Lô">{(fieldId) => <input id={fieldId} value={form.grave_lot} onChange={(event) => update("grave_lot", event.target.value)} />}</Field>
          </div>
          <Field label="Vị trí trong Hoa Viên" hint={`Để trống nếu ở ${field && field !== "Văn hóa nghệ thuật" ? "khu chung" : "Đường Nghệ Sỹ"}. Ví dụ “Khu K1.5, mộ gia tộc”.`}>
            {(fieldId) => <input id={fieldId} value={form.resting_place} onChange={(event) => update("resting_place", event.target.value)} />}
          </Field>
        </> : <>
          <Field label="Tên nơi an nghỉ" hint="Ví dụ “Chùa Nghệ sỹ (Nhựt Quang Tự)”.">{(fieldId) => <input id={fieldId} value={form.resting_place} onChange={(event) => update("resting_place", event.target.value)} />}</Field>
          <Field label="Địa chỉ">{(fieldId) => <input id={fieldId} value={form.resting_address} onChange={(event) => update("resting_address", event.target.value)} />}</Field>
        </>}
        <div className="admin-row">
          <Field label="Vĩ độ (GPS)" error={coordinatesValid ? null : "Tọa độ chưa đúng."} hint="Trên Google Maps: nhấn giữ vị trí mộ, chép số đầu.">{(fieldId) => <input id={fieldId} inputMode="decimal" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} />}</Field>
          <Field label="Kinh độ (GPS)" hint="Chép số thứ hai.">{(fieldId) => <input id={fieldId} inputMode="decimal" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} />}</Field>
        </div>
        <Field label="Link bản đồ" hint="Chỉ dùng khi chưa có tọa độ.">{(fieldId) => <input id={fieldId} type="url" value={form.maps_url} onChange={(event) => update("maps_url", event.target.value)} />}</Field>
      </section>

      <section className="admin-card">
        <h2>Nguồn tham khảo</h2>
        <Field label="Mỗi dòng một nguồn" hint="Tên bài | link, ví dụ VnExpress: Nghệ sĩ qua đời | https://vnexpress.net/...">{(fieldId) => <textarea id={fieldId} rows={4} value={form.sources} onChange={(event) => update("sources", event.target.value)} />}</Field>
      </section>

      <section className="admin-card">
        <h2>Hiển thị</h2>
        <label className="admin-check"><input type="checkbox" checked={form.is_published} onChange={(event) => update("is_published", event.target.checked)} />Hiện hồ sơ này trên trang</label>
        <p className={reason ? "admin-status is-hidden" : "admin-status is-shown"}>{reason ? `Sau khi lưu, hồ sơ sẽ ẩn: ${reason.toLowerCase()}.` : "Sau khi lưu, hồ sơ sẽ hiện trên trang."}</p>
      </section>

      <div className="admin-savebar">
        {message && <p className={message.kind === "ok" ? "admin-ok" : "admin-error"} role="status">{message.text}</p>}
        {dirty && !message && <p className="admin-muted">Có thay đổi chưa lưu.</p>}
        <button className="admin-button" type="submit" disabled={saveProfile.isPending || uploading}>{saveProfile.isPending ? "Đang lưu" : id ? "Lưu thay đổi" : "Tạo hồ sơ"}</button>
      </div>
    </form>

    {id && profile && <>
      <ItemsEditor profileId={id} kind="work" title={field && field !== "Văn hóa nghệ thuật" ? "Thành tựu" : "Tác phẩm, vai diễn"} />
      <ItemsEditor profileId={id} kind="milestone" title="Mốc cuộc đời" />
      <ArchivePhotos profileId={id} />
    </>}
  </>;
}
