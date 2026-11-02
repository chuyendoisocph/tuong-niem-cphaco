// The site's name lives in src/config/site.json, shared with the build script that writes share previews.
import site from "@/config/site.json";

export const SITE_NAME = site.name;
export const SITE_SUBTITLE = site.subtitle;
export const SITE_TITLE = `${SITE_NAME} · ${SITE_SUBTITLE}`;
export const SITE_DESCRIPTION = site.description;
// Artists resting outside Hoa Viên stay in the database but are kept off the site until its scope is settled.
export const SHOW_OUTSIDE_HOA_VIEN = site.showOutsideHoaVien;
// Filled in src/config/site.json once Hoa Viên confirms them; empty lines stay off the home page.
export const VISIT_INFO = site.visit;
export const GRAVE_MAP_URL = "https://bandoso.cphaco.app/";

export const pageTitle = (page?: string) => (page ? `${page} | ${SITE_TITLE}` : SITE_TITLE);
