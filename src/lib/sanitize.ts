import DOMPurify from 'dompurify';

/**
 * Formats biography text by converting line breaks into list items
 * Detects patterns like "Thông tin chính:", "Tên thật:", etc. and creates structured HTML
 */
export function formatBiography(text: string | null | undefined): string {
  if (!text) return '';
  
  // Split by double newlines for paragraphs, or by single newlines for list items
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return '';
  
  // First line is the intro - keep as paragraph
  const intro = lines[0];
  const details = lines.slice(1);
  
  // Create HTML structure
  let html = `<p>${intro}</p>`;
  
  // Convert remaining lines to individual paragraphs (which CSS will add bullets to)
  if (details.length > 0) {
    details.forEach(line => {
      if (line.trim()) {
        html += `<p>${line.trim()}</p>`;
      }
    });
  }
  
  return html;
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Only allows safe tags and attributes.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  
  // Check if text contains HTML tags already
  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(dirty);
  
  // If no HTML tags, format it as biography with bullets
  const content = hasHtmlTags ? dirty : formatBiography(dirty);
  
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'span', 'div'],
    ALLOWED_ATTR: ['class', 'style'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur']
  });
}
