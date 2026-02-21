'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigation } from '@/lib/navigation';

export default function Sidebar() {
    const pathname = usePathname();
    const currentSlug = pathname.replace('/docs/', '').replace(/\/$/, '');

    return (
        <aside className="sidebar">
            <Link href="/" className="sidebar-logo">
                <div className="sidebar-logo-icon">Z</div>
                <span className="sidebar-logo-text">Zilol Native</span>
                <span className="sidebar-logo-badge">Docs</span>
            </Link>

            {navigation.map((section) => (
                <nav key={section.title} className="sidebar-section">
                    <div className="sidebar-section-title">{section.title}</div>
                    {section.items.map((item) => (
                        <Link
                            key={item.slug}
                            href={`/docs/${item.slug}`}
                            className={`sidebar-link ${currentSlug === item.slug ? 'active' : ''}`}
                        >
                            {item.title}
                        </Link>
                    ))}
                </nav>
            ))}
        </aside>
    );
}
