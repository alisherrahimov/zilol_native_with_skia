'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { navigation } from '@/lib/navigation';

interface SearchItem {
    title: string;
    slug: string;
    section: string;
}

export default function Navbar() {
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchItem[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const allItems: SearchItem[] = navigation.flatMap((section) =>
        section.items.map((item) => ({
            ...item,
            section: section.title,
        }))
    );

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery('');
            setResults([]);
            setActiveIndex(0);
        }
    }, [searchOpen]);

    const handleSearch = useCallback(
        (q: string) => {
            setQuery(q);
            setActiveIndex(0);
            if (!q.trim()) {
                setResults([]);
                return;
            }
            const lower = q.toLowerCase();
            setResults(
                allItems.filter(
                    (item) =>
                        item.title.toLowerCase().includes(lower) ||
                        item.section.toLowerCase().includes(lower)
                )
            );
        },
        [allItems]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[activeIndex]) {
            router.push(`/docs/${results[activeIndex].slug}`);
            setSearchOpen(false);
        }
    };

    return (
        <>
            <header className="navbar">
                <span className="navbar-title">Documentation</span>
                <div className="navbar-actions">
                    <button
                        className="search-trigger"
                        onClick={() => setSearchOpen(true)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Search docs...
                        <kbd>⌘K</kbd>
                    </button>
                    <a
                        href="https://github.com/zilol-native/zilol-native"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text-muted)', display: 'flex' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                    </a>
                </div>
            </header>

            {searchOpen && (
                <div
                    className="search-modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSearchOpen(false);
                    }}
                >
                    <div className="search-modal">
                        <div className="search-input-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                ref={inputRef}
                                className="search-input"
                                placeholder="Search documentation..."
                                value={query}
                                onChange={(e) => handleSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className="search-results">
                            {query && results.length === 0 && (
                                <div className="search-empty">
                                    No results for &quot;{query}&quot;
                                </div>
                            )}
                            {results.map((item, i) => (
                                <a
                                    key={item.slug}
                                    href={`/docs/${item.slug}`}
                                    className={`search-result-item ${i === activeIndex ? 'active' : ''}`}
                                    onClick={() => setSearchOpen(false)}
                                >
                                    <div className="search-result-title">{item.title}</div>
                                    <div className="search-result-section">{item.section}</div>
                                </a>
                            ))}
                            {!query && (
                                <div className="search-empty">
                                    Type to search the documentation
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
