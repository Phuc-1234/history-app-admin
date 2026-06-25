/**
 * Strips HTML tags from a string.
 * Used to display previews or plaintext versions of CKEditor HTML content.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '');
}
