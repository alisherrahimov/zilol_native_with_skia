import { notFound } from 'next/navigation';
import { getDocBySlug } from '@/lib/docs';
import { renderMarkdown, extractHeadings } from '@/lib/markdown';
import { getDocNavigation } from '@/lib/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

interface PageProps {
    params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const doc = getDocBySlug(slug);
    if (!doc) return { title: 'Not Found' };
    return {
        title: `${doc.meta.title} — Zilol Native`,
        description: doc.meta.description,
    };
}

export default async function DocPage({ params }: PageProps) {
    const { slug } = await params;
    const slugPath = slug.join('/');
    const doc = getDocBySlug(slug);

    if (!doc) notFound();

    const html = await renderMarkdown(doc.content);
    const headings = extractHeadings(doc.content);
    const { prev, next } = getDocNavigation(slugPath);

    return (
        <div className="doc-layout">
            <article className="doc-content">
                <div className="prose">
                    <h1>{doc.meta.title}</h1>
                    {doc.meta.description && (
                        <p className="doc-description">{doc.meta.description}</p>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                </div>

                <nav className="doc-nav">
                    {prev ? (
                        <Link href={`/docs/${prev.slug}`} className="doc-nav-link prev">
                            <div className="doc-nav-link-label">← Previous</div>
                            <div className="doc-nav-link-title">{prev.title}</div>
                        </Link>
                    ) : <div />}
                    {next ? (
                        <Link href={`/docs/${next.slug}`} className="doc-nav-link next">
                            <div className="doc-nav-link-label">Next →</div>
                            <div className="doc-nav-link-title">{next.title}</div>
                        </Link>
                    ) : <div />}
                </nav>
            </article>

            {headings.length > 0 && (
                <aside className="toc">
                    <div className="toc-title">On this page</div>
                    {headings.map((h) => (
                        <a
                            key={h.id}
                            href={`#${h.id}`}
                            className={`toc-link ${h.depth === 3 ? 'depth-3' : ''}`}
                        >
                            {h.text}
                        </a>
                    ))}
                </aside>
            )}
        </div>
    );
}
