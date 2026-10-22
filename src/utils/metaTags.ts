// Utility functions for updating meta tags dynamically

export const updateMetaTags = (options: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}) => {
  const { title, description, image, url } = options;

  // Update document title
  if (title) {
    document.title = title;
  }

  // Update meta description
  if (description) {
    updateMetaTag('description', description);
    updateMetaTag('og:description', description);
    updateMetaTag('twitter:description', description);
  }

  // Update meta title
  if (title) {
    updateMetaTag('og:title', title);
    updateMetaTag('twitter:title', title);
  }

  // Update meta image
  if (image) {
    updateMetaTag('og:image', image);
    updateMetaTag('twitter:image', image);
  }

  // Update meta URL
  if (url) {
    const canonicalUrl = new URL(url);
    canonicalUrl.hash = '';
    canonicalUrl.search = '';
    updateMetaTag('og:url', canonicalUrl.href);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl.href;
  }
};

const updateMetaTag = (property: string, content: string) => {
  // Handle different meta tag types
  let selector = '';
  let attribute = '';

  if (property.startsWith('og:') || property.startsWith('twitter:')) {
    selector = `meta[property="${property}"]`;
    attribute = 'property';
  } else {
    selector = `meta[name="${property}"]`;
    attribute = 'name';
  }

  let metaTag = document.querySelector(selector) as HTMLMetaElement;
  
  if (metaTag) {
    metaTag.content = content;
  } else {
    // Create new meta tag if it doesn't exist
    metaTag = document.createElement('meta');
    metaTag.setAttribute(attribute, property);
    metaTag.content = content;
    document.head.appendChild(metaTag);
  }
};

export const resetMetaTags = () => {
  updateMetaTags({
    title: 'Đường Nghệ Sỹ · Hoa Viên Bình Dương | Tưởng niệm nghệ sĩ',
    description: 'Nhớ về những nghệ sĩ đang an nghỉ tại Đường Nghệ Sỹ, Hoa Viên Bình Dương.',
    url: window.location.origin
  });
};
