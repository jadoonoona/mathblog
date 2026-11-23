import type { FeaturedProject } from './home';

interface Article {
    title: string;
    date?: string;
    description?: string;
    category?: string;
    tags?: string[];
    hidden?: boolean;
}

// Discover article metadata once so both language categories include new Markdown pages automatically.
const files = import.meta.glob<{ frontmatter: Article }>('../pages/projects/mathematics/*.md', { eager: true });
const koreanFiles = import.meta.glob<{ frontmatter: Article }>('../pages/ko/projects/mathematics/*.md', { eager: true });
export function mathematicsArticles(lang: 'en' | 'ko'): FeaturedProject[] {
    const localized = new Map(Object.entries(files).map(([path, article]) => [path.split('/').pop()!, { path, article }]));
    if (lang === 'ko') {
        for (const [path, article] of Object.entries(koreanFiles)) {
            localized.set(path.split('/').pop()!, { path, article });
        }
    }
    return Array.from(localized.values(), ({ path, article }) => [path, article] as const)
        .filter(([, article]) => !article.frontmatter.hidden)
        .sort(([, a], [, b]) => (b.frontmatter.date ?? '').localeCompare(a.frontmatter.date ?? ''))
        .map(([path, { frontmatter }], index) => ({
            number: String(index + 1).padStart(2, '0'),
            title: frontmatter.title,
            description: frontmatter.description ?? frontmatter.category ?? '',
            tags: frontmatter.tags ?? (frontmatter.category ? [frontmatter.category] : []),
            link: `${path.includes('/ko/') ? 'ko/' : ''}projects/mathematics/${path.split('/').pop()!.replace(/\.md$/, '')}/`,
            linkLabel: lang === 'ko' ? '글 읽기' : 'Read article',
            category: 'mathematics',
            status: frontmatter.date,
        }));
}
