import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_VISITOR_PHOTOS, useSendTribute, type TributeResult } from "@/hooks/usePublicMemorial";
import { shrinkPhoto } from "@/lib/image";

type PickedPhoto = { blob: Blob; preview: string };

export function TributeForm({ profileId, shortName, prompts = [] }: { profileId: string; shortName: string; prompts?: string[] }) {
  const id = useId();
  const sendTribute = useSendTribute();
  const fileInput = useRef<HTMLInputElement>(null);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [submitted, setSubmitted] = useState<{ visibility: "public" | "private"; result: TributeResult } | null>(null);
  const [nameError, setNameError] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const previews = useRef<string[]>([]);
  previews.current = photos.map((photo) => photo.preview);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function clearPhotos() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
  }

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_VISITOR_PHOTOS - photos.length);
    event.target.value = "";
    if (!files.length) return;
    setPreparing(true);
    setPhotoError(false);
    const picked: PickedPhoto[] = [];
    for (const file of files) {
      try {
        const blob = await shrinkPhoto(file);
        picked.push({ blob, preview: URL.createObjectURL(blob) });
      } catch {
        setPhotoError(true);
      }
    }
    setPhotos((current) => [...current, ...picked].slice(0, MAX_VISITOR_PHOTOS));
    setPreparing(false);
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, position) => position !== index);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendTribute.isPending || preparing) return;
    const missingName = !authorName.trim();
    const missingContent = !content.trim();
    setNameError(missingName);
    setContentError(missingContent);
    setNetworkError(false);
    if (missingName || missingContent) return;

    try {
      const result = await sendTribute.mutateAsync({
        profile_id: profileId,
        author_name: authorName.trim(),
        content: content.trim(),
        prompt,
        is_public: isPublic,
        photos: isPublic ? photos.map((photo) => photo.blob) : [],
      });
      setSubmitted({ visibility: isPublic ? "public" : "private", result });
    } catch {
      setNetworkError(true);
    }
  }

  if (submitted) {
    const { photosSent, photosFailed } = submitted.result;
    return <div className="memorial-form-success" role="status">
      <p>{submitted.visibility === "public" ? "Lời tưởng nhớ của bạn đã được ghi lại." : "Lời tưởng nhớ của bạn đã được gửi riêng, không hiển thị trên trang."}</p>
      {photosSent > 0 && <small>{photosSent} ảnh của bạn sẽ hiện trên trang sau khi được Hoa Viên xem qua.</small>}
      {photosFailed > 0 && <small className="memorial-form-error">{photosFailed} ảnh chưa gửi được. Lời nhắn vẫn đã được ghi lại.</small>}
      <button type="button" onClick={() => {
        setSubmitted(null);
        setAuthorName("");
        setContent("");
        setPrompt(null);
        clearPhotos();
        setIsPublic(true);
        setNameError(false);
        setContentError(false);
        setNetworkError(false);
        setPhotoError(false);
      }}>Viết thêm một lời</button>
    </div>;
  }

  return <form className="memorial-form" onSubmit={handleSubmit} noValidate>
    <div>
      <label htmlFor={`${id}-name`}>Tên của bạn</label>
      <input
        id={`${id}-name`}
        type="text"
        autoComplete="name"
        maxLength={100}
        placeholder="Nguyễn Văn A"
        value={authorName}
        aria-invalid={nameError}
        aria-describedby={nameError ? `${id}-name-error` : undefined}
        onChange={(event) => { setAuthorName(event.target.value); if (nameError) setNameError(false); }}
      />
      {nameError && <p id={`${id}-name-error`} className="memorial-field-error">Xin cho biết tên của bạn.</p>}
    </div>
    {prompts.length > 0 && <fieldset className="memorial-prompts">
      <legend>Chưa biết bắt đầu từ đâu? Chọn một câu hỏi</legend>
      <div>{prompts.map((question) => <button key={question} type="button" aria-pressed={prompt === question} onClick={() => setPrompt((current) => current === question ? null : question)}>{question}</button>)}</div>
    </fieldset>}
    <div>
      <label htmlFor={`${id}-content`}>{prompt ?? "Lời nhắn"}</label>
      <textarea
        id={`${id}-content`}
        rows={5}
        maxLength={2000}
        placeholder={prompt ? "Viết câu trả lời của bạn..." : `Viết đôi lời về những ký ức, tình cảm dành cho ${shortName}...`}
        value={content}
        aria-invalid={contentError}
        aria-describedby={contentError ? `${id}-content-error` : undefined}
        onChange={(event) => { setContent(event.target.value); if (contentError) setContentError(false); }}
      />
      {contentError && <p id={`${id}-content-error`} className="memorial-field-error">Xin viết đôi lời.</p>}
    </div>
    {isPublic && <div className="memorial-photo-picker">
      <span className="memorial-photo-picker-label" id={`${id}-photos`}>Ảnh kỷ niệm (không bắt buộc)</span>
      {photos.length > 0 && <ul aria-labelledby={`${id}-photos`}>{photos.map((photo, index) => <li key={photo.preview}>
        <img src={photo.preview} alt={`Ảnh đã chọn ${index + 1}`} />
        <button type="button" aria-label={`Bỏ ảnh ${index + 1}`} onClick={() => removePhoto(index)}><X size={16} aria-hidden="true" /></button>
      </li>)}</ul>}
      {photos.length < MAX_VISITOR_PHOTOS && <button type="button" className="memorial-photo-add" disabled={preparing} onClick={() => fileInput.current?.click()}>
        <ImagePlus size={18} aria-hidden="true" />{preparing ? "Đang chuẩn bị ảnh" : photos.length ? "Thêm ảnh" : `Đính kèm tối đa ${MAX_VISITOR_PHOTOS} ảnh`}
      </button>}
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={addPhotos} />
      {photoError && <p className="memorial-field-error">Có ảnh không đọc được. Xin chọn ảnh JPG hoặc PNG khác.</p>}
      <p className="memorial-photo-note">Ảnh sẽ hiện cùng lời nhắn sau khi được Hoa Viên xem qua.</p>
    </div>}
    <label className="memorial-checkbox">
      <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
      <span>Hiển thị công khai lời nhắn này</span>
    </label>
    {networkError && <p className="memorial-form-error" role="alert">Chưa gửi được. Xin thử lại sau ít phút.</p>}
    <div><button className="memorial-button" type="submit" disabled={sendTribute.isPending || preparing || !profileId}>
      {sendTribute.isPending ? (photos.length && isPublic ? "Đang gửi lời và ảnh" : "Đang gửi") : "Gửi lời tưởng niệm"}
    </button></div>
  </form>;
}
