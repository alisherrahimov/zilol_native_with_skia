'use client';

import { useState, useRef, useCallback } from 'react';

interface CodeBlockProps {
    code: string;
    language?: string;
    highlightedHtml?: string;
}

export default function CodeBlock({ code, language, highlightedHtml }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
    }, [code]);

    return (
        <div className="code-block-wrapper">
            <div className="code-block-header">
                <span className="code-block-lang">{language || 'text'}</span>
                <button
                    className={`code-block-copy ${copied ? 'copied' : ''}`}
                    onClick={handleCopy}
                >
                    {copied ? '✓ Copied' : 'Copy'}
                </button>
            </div>
            {highlightedHtml ? (
                <pre dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
            ) : (
                <pre>
                    <code>{code}</code>
                </pre>
            )}
        </div>
    );
}
