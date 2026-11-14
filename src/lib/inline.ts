import { MAIL_ICON_SVG } from "./icons.ts";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const renderInline = (value: string, internalHref: (path: string) => string = (path) => path) =>
  escapeHtml(value)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g, (_match, text: string, href: string) => {
      if (href.startsWith("http")) {
        try {
          const url = new URL(href);
          if (url.origin === "https://www.thefriendsofashley.org" && !url.username && !url.password) {
            return `<a class="text-link" href="${internalHref(`${url.pathname}${url.search}${url.hash}`)}">${text}</a>`;
          }
        } catch {
          // Keep malformed URLs as external links rather than failing the newsletter render.
        }
      }
      const external = href.startsWith("http");
      if (!external) {
        const icon = MAIL_ICON_SVG;
        // Render supported emphasis first, then insert only inside the final
        // text segment. Opening/closing emphasis tags never cross the tail.
        const formatted = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
        const ending = formatted.replace(/([^<>]+)((?:<\/(?:strong|em)>)*)$/u, (_segment, finalText: string, closingTags: string) => {
          const split = finalText.lastIndexOf(" ") + 1;
          const prefix = finalText.slice(0, split);
          const lastWord = finalText.slice(split);
          const tail = lastWord.includes("@") && /\.[^.@]+$/.test(lastWord)
            ? lastWord.replace(/(\.[^.@]+)$/u, `<span class="cta-tail">$1${icon}</span>`)
            : `<span class="cta-tail">${lastWord}${icon}</span>`;
          return prefix + tail + closingTags;
        });
        return `<a class="text-link" href="${href}">${ending}</a>`;
      }
      const split = text.lastIndexOf(" ") + 1;
      const prefix = text.slice(0, split);
      const lastWord = text.slice(split);
      const icon = '<span class="external-link-icon" aria-hidden="true"><svg data-cta-arrow="external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></span>';
      // Preserve emphasis delimiters together so the final Markdown pass
      // cannot create crossing tags. Plain words can fall back to wrapping
      // within a very narrow column, keeping their final character and arrow
      // together. Escaped HTML entities must remain intact too.
      const ending = lastWord.replace(/(&[a-z]+;|.)$/u, `<span class="cta-tail">$1${icon}</span>`);
      const labelled = lastWord.includes("*")
        ? `${prefix}<span class="cta-tail">${lastWord}${icon}</span>`
        : /[./]/.test(lastWord)
          ? prefix + ending
          : `${prefix}<span class="cta-word">${ending}</span>`;
      return `<a class="text-link" href="${href}" target="_blank" rel="noopener noreferrer">${labelled}<span class="visually-hidden"> (opens in a new tab)</span></a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
