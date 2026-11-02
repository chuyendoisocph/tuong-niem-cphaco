// Zalo and Facebook read a page's <head> without running its JavaScript, so a pasted link to /lam-phuong would only
// ever show the site's generic title. After `vite build`, this writes dist/<slug>.html for every public profile: the same
// app shell, with that person's name, description and portrait in the share tags. Hosts serve /<slug> from <slug>.html
// (vercel.json sets cleanUrls) before falling back to index.html, and the app then renders the page as usual.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const site = JSON.parse(readFileSync(path.join(root, "src/config/site.json"), "utf8"));
const env = loadEnv("production", root, "VITE_");
const siteTitle = `${site.name} · ${site.subtitle}`;

// The public address, for absolute share links. Set SITE_URL on the host; Vercel also provides its production domain.
const origin = (process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || "").replace(/\/+$/, "");

const escapeAttr = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Matches localSpelling in src/lib/memorial.ts: Hoa Viên writes "nghệ sỹ".
const localSpelling = (text) => text.normalize("NFC").replace(/(nghệ|Nghệ|NGHỆ)(\s+)(sĩ|Sĩ|SĨ)(?![\p{L}])/gu,
  (_, first, space, second) => first + space + ({ "sĩ": "sỹ", "Sĩ": "Sỹ", "SĨ": "SỸ" })[second]);
const yearOf = (date) => (date ? date.slice(0, 4) : "?");

// Matches hiddenReason in src/hooks/usePublicMemorial.ts.
const isPublic = (profile) => (profile.avatar_url?.trim() || (profile.biography?.trim() && profile.tagline?.trim()))
  && (site.showOutsideHoaVien || profile.in_hoa_vien !== false);

// Cloudinary portraits are fitted whole into the 1200x630 card Facebook and Zalo show, on the site's paper colour.
function shareImage(url) {
  if (!url) return origin ? `${origin}/icon-512.png` : null;
  return url.replace(/res\.cloudinary\.com\/([^/]+)\/image\/upload\//, "res.cloudinary.com/$1/image/upload/c_pad,w_1200,h_630,b_rgb:f6f1e2,f_jpg/");
}

function setTag(html, pattern, tag) {
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function withShareTags(shell, { title, description, image, url }) {
  let html = shell.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(title)}</title>`);
  html = setTag(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${escapeAttr(description)}" />`);
  html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeAttr(title)}" />`);
  html = setTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeAttr(description)}" />`);
  if (image) html = setTag(html, /<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeAttr(image)}" />`);
  if (url) {
    html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escapeAttr(url)}" />`);
    html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escapeAttr(url)}" />`);
  }
  return html;
}

const shellPath = path.join(dist, "index.html");
const shell = readFileSync(shellPath, "utf8");
// The home page gets the default image and address too.
writeFileSync(shellPath, withShareTags(shell, { title: siteTitle, description: site.description, image: shareImage(null), url: origin ? `${origin}/` : null }));

try {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) throw new Error("Supabase settings are missing");
  const columns = "slug,name,tagline,biography,birth_date,death_date,avatar_url,in_hoa_vien";
  const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/profiles?select=${columns}&is_celebrity=eq.true&is_published=eq.true&slug=not.is.null`, {
    headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
  });
  if (!response.ok) throw new Error(`Supabase answered ${response.status}`);
  const profiles = (await response.json()).filter(isPublic).filter((profile) => /^[a-z0-9-]+$/.test(profile.slug));
  for (const profile of profiles) {
    const name = localSpelling(profile.name).replace(/\s*[–—]\s*/g, " - ").replace(/\s+/g, " ").trim();
    const tagline = profile.tagline ? localSpelling(profile.tagline).trim() : "";
    const description = `${name} (${yearOf(profile.birth_date)} - ${yearOf(profile.death_date)}). ${tagline ? tagline.replace(/[.\s]*$/, ". ") : ""}Cùng tưởng nhớ và để lại đôi lời tại ${site.name}.`;
    writeFileSync(path.join(dist, `${profile.slug}.html`), withShareTags(shell, {
      title: `${name} | ${siteTitle}`,
      description,
      image: shareImage(profile.avatar_url),
      url: origin ? `${origin}/${profile.slug}` : null,
    }));
  }
  console.log(`share-pages: ${profiles.length} profile pages${origin ? ` for ${origin}` : " (set SITE_URL for absolute share links)"}`);
} catch (error) {
  // A failed fetch must not stop the deploy; links then share with the site's generic preview, as before.
  console.warn(`share-pages: skipped profile pages: ${error.message}`);
}
