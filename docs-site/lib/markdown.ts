import { createHighlighter } from "shiki";

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: [
        "typescript",
        "tsx",
        "javascript",
        "jsx",
        "json",
        "bash",
        "cpp",
        "swift",
        "kotlin",
        "css",
        "html",
        "rust",
        "yaml",
        "markdown",
        "text",
      ],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  lang: string,
): Promise<string> {
  try {
    const highlighter = await getHighlighter();
    const validLang = highlighter.getLoadedLanguages().includes(lang as any)
      ? lang
      : "text";
    const html = highlighter.codeToHtml(code.trim(), {
      lang: validLang,
      theme: "github-dark",
    });
    // Extract inner HTML from the <pre><code> wrapper shiki generates
    const match = html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/);
    return match ? match[1] : code;
  } catch {
    return code;
  }
}

interface ParsedBlock {
  type: "text" | "code";
  content: string;
  language?: string;
}

export function parseMarkdown(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = content.split("\n");
  let i = 0;
  let textBuffer: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const codeMatch = line.match(/^```(\w*)/);

    if (codeMatch) {
      // Flush text buffer
      if (textBuffer.length > 0) {
        blocks.push({ type: "text", content: textBuffer.join("\n") });
        textBuffer = [];
      }

      const lang = codeMatch[1] || "text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: "code",
        content: codeLines.join("\n"),
        language: lang,
      });
      i++; // skip closing ```
    } else {
      textBuffer.push(line);
      i++;
    }
  }

  if (textBuffer.length > 0) {
    blocks.push({ type: "text", content: textBuffer.join("\n") });
  }

  return blocks;
}

function textToHtml(text: string): string {
  let html = text;

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 id="$1">$1</h4>');
  html = html.replace(/^### (.+)$/gm, (_, title) => {
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return `<h3 id="${id}">${title}</h3>`;
  });
  html = html.replace(/^## (.+)$/gm, (_, title) => {
    const id = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return `<h2 id="${id}">${title}</h2>`;
  });
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr />");

  // Bold & Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Tables
  html = html.replace(
    /(?:^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*))/gm,
    (_, headerRow, _separator, bodyRows) => {
      const headers = headerRow
        .split("|")
        .filter((c: string) => c.trim())
        .map((c: string) => `<th>${c.trim()}</th>`)
        .join("");
      const rows = bodyRows
        .trim()
        .split("\n")
        .map((row: string) => {
          const cells = row
            .split("|")
            .filter((c: string) => c.trim())
            .map((c: string) => `<td>${c.trim()}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    },
  );

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, "\n");

  // Unordered lists
  html = html.replace(/(?:^- .+$\n?)+/gm, (match) => {
    const items = match
      .trim()
      .split("\n")
      .map((line) => `<li>${line.replace(/^- /, "")}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  // Paragraphs
  html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, (match) => {
    const trimmed = match.trim();
    if (!trimmed || trimmed.startsWith("<")) return match;
    return `<p>${trimmed}</p>`;
  });

  // Clean up empty lines
  html = html.replace(/\n{3,}/g, "\n\n");

  return html;
}

export async function renderMarkdown(content: string): Promise<string> {
  const blocks = parseMarkdown(content);
  const parts: string[] = [];

  for (const block of blocks) {
    if (block.type === "code") {
      const highlighted = await highlightCode(
        block.content,
        block.language || "text",
      );
      parts.push(
        `<div class="code-block-wrapper" data-lang="${block.language || "text"}" data-code="${encodeURIComponent(block.content)}">` +
          `<div class="code-block-header">` +
          `<span class="code-block-lang">${block.language || "text"}</span>` +
          `<button class="code-block-copy" onclick="(function(b){navigator.clipboard.writeText(decodeURIComponent(b.closest('.code-block-wrapper').dataset.code));b.textContent='✓ Copied';b.classList.add('copied');setTimeout(()=>{b.textContent='Copy';b.classList.remove('copied')},2000)})(this)">Copy</button>` +
          `</div>` +
          `<pre><code>${highlighted}</code></pre>` +
          `</div>`,
      );
    } else {
      parts.push(textToHtml(block.content));
    }
  }

  return parts.join("\n");
}

export function extractHeadings(
  content: string,
): { id: string; text: string; depth: number }[] {
  const headings: { id: string; text: string; depth: number }[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{2,3}) (.+)$/);
    if (match) {
      const depth = match[1].length;
      const text = match[2];
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      headings.push({ id, text, depth });
    }
  }

  return headings;
}
