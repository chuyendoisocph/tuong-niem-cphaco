import { useId, useState, type FormEvent } from "react";
import { useSendTribute } from "@/hooks/usePublicMemorial";

export function TributeForm({ profileId, shortName }: { profileId: string; shortName: string }) {
  const id = useId();
  const sendTribute = useSendTribute();
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitted, setSubmitted] = useState<"public" | "private" | null>(null);
  const [nameError, setNameError] = useState(false);
  const [contentError, setContentError] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendTribute.isPending) return;
    const missingName = !authorName.trim();
    const missingContent = !content.trim();
    setNameError(missingName);
    setContentError(missingContent);
    setNetworkError(false);
    if (missingName || missingContent) return;

    try {
      await sendTribute.mutateAsync({
        profile_id: profileId,
        author_name: authorName.trim(),
        content: content.trim(),
        is_public: isPublic,
      });
      setSubmitted(isPublic ? "public" : "private");
    } catch {
      setNetworkError(true);
    }
  }

  if (submitted) {
    return <div className="memorial-form-success" role="status">
      <p>{submitted === "public" ? "Lời tưởng nhớ của bạn đã được ghi lại." : "Lời tưởng nhớ của bạn đã được gửi riêng, không hiển thị trên trang."}</p>
      <button type="button" onClick={() => {
        setSubmitted(null);
        setAuthorName("");
        setContent("");
        setIsPublic(true);
        setNameError(false);
        setContentError(false);
        setNetworkError(false);
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
    <div>
      <label htmlFor={`${id}-content`}>Lời nhắn</label>
      <textarea
        id={`${id}-content`}
        rows={5}
        maxLength={2000}
        placeholder={`Viết đôi lời về những ký ức, tình cảm dành cho ${shortName}...`}
        value={content}
        aria-invalid={contentError}
        aria-describedby={contentError ? `${id}-content-error` : undefined}
        onChange={(event) => { setContent(event.target.value); if (contentError) setContentError(false); }}
      />
      {contentError && <p id={`${id}-content-error`} className="memorial-field-error">Xin viết đôi lời.</p>}
    </div>
    <label className="memorial-checkbox">
      <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
      <span>Hiển thị công khai lời nhắn này</span>
    </label>
    {networkError && <p className="memorial-form-error" role="alert">Chưa gửi được. Xin thử lại sau ít phút.</p>}
    <div><button className="memorial-button" type="submit" disabled={sendTribute.isPending || !profileId}>
      {sendTribute.isPending ? "Đang gửi" : "Gửi lời tưởng niệm"}
    </button></div>
  </form>;
}
