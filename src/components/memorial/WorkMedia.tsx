import { useState } from "react";
import { Play } from "lucide-react";

// Shows the video's still and loads YouTube only when the visitor presses play, so pages stay light and nothing
// is sent to YouTube for visitors who never watch.
export function YouTubePlayer({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return <div className="memorial-video">
    {playing
      ? <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      : <button type="button" onClick={() => setPlaying(true)} aria-label={`Phát “${title}”`}>
        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
        <span className="memorial-video-play" aria-hidden="true"><Play size={26} fill="currentColor" /></span>
      </button>}
  </div>;
}

export function WorkExcerpt({ text, title }: { text: string; title: string }) {
  return <figure className="memorial-excerpt">
    <blockquote>{text}</blockquote>
    <figcaption>Trích “{title}”</figcaption>
  </figure>;
}
