import { useId, useState, type FormEvent } from "react";
import { useSendTribute } from "@/hooks/usePublicMemorial";

export function TributeForm({ profileId, shortName }: { profileId: string; shortName: string }) {
  const id = useId();
  const sendTribute = useSendTribute();
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);
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
      });
      setSubmitted(true);
    } catch {
      setNetworkError(true);
    }
  }

  if (submitted) {
    return <div className="memorial-form-success" role="status">
      <p>Lời tri ân của bạn đã được ghi lại.</p>
      <button type="button" onClick={() => {
        setSubmitted(false);
        setAuthorName("");
        setContent("");
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
        value={authorName}
        aria-invalid={nameError}
        aria-describedby={nameError ? `${id}-name-error` : undefined}
        onChange={(event) => { setAuthorName(event.target.value); if (nameError) setNameError(false); }}
      />
      {nameError && <p id={`${id}-name-error`} className="memorial-field-error">Xin cho biết tên của bạn.</p>}
    </div>
    <div>
      <label htmlFor={`${id}-content`}>Lời tri ân</label>
      <textarea
        id={`${id}-content`}
        rows={5}
        maxLength={2000}
        placeholder={`Một ký ức, một tác phẩm bạn còn nhớ về ${shortName}`}
        value={content}
        aria-invalid={contentError}
        aria-describedby={contentError ? `${id}-content-error ${id}-note` : `${id}-note`}
        onChange={(event) => { setContent(event.target.value); if (contentError) setContentError(false); }}
      />
      {contentError && <p id={`${id}-content-error`} className="memorial-field-error">Xin viết đôi lời.</p>}
      <p id={`${id}-note`} className="memorial-form-note">Lời của bạn sẽ hiển thị công khai cùng với tên.</p>
    </div>
    {networkError && <p className="memorial-form-error" role="alert">Chưa gửi được. Xin thử lại sau ít phút.</p>}
    <div><button className="memorial-button" type="submit" disabled={sendTribute.isPending || !profileId}>
      {sendTribute.isPending ? "Đang gửi" : "Gửi lời tri ân"}
    </button></div>
  </form>;
}
