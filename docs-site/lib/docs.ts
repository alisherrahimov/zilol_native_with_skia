import fs from "fs";
import path from "path";
import matter from "gray-matter";

const contentDirectory = path.join(process.cwd(), "content", "docs");

export interface DocMeta {
  title: string;
  description: string;
  slug: string;
  order?: number;
}

export interface Doc {
  meta: DocMeta;
  content: string;
}

export function getDocBySlug(slugParts: string[]): Doc | null {
  const slugPath = slugParts.join("/");
  const filePath = path.join(contentDirectory, `${slugPath}.md`);

  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);

  return {
    meta: {
      title: data.title || slugParts[slugParts.length - 1],
      description: data.description || "",
      slug: slugPath,
      order: data.order,
    },
    content,
  };
}

export function getAllDocs(): DocMeta[] {
  const docs: DocMeta[] = [];

  function walk(dir: string, prefix: string = "") {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith(".md")) {
        const slug = `${prefix}${entry.name.replace(".md", "")}`;
        const fileContent = fs.readFileSync(
          path.join(dir, entry.name),
          "utf-8",
        );
        const { data } = matter(fileContent);
        docs.push({
          title: data.title || entry.name.replace(".md", ""),
          description: data.description || "",
          slug,
          order: data.order,
        });
      }
    }
  }

  walk(contentDirectory);
  return docs;
}
