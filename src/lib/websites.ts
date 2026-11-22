import type { Website } from '../data/websites';
export interface WebsiteFilters {
    query: string;
    category: string;
    tags: string[];
    favoritesOnly: boolean;
    sort: 'newest' | 'name';
}
export const FAVORITES_KEY = 'mathblog.website-favorites.v1';
export const websiteDomain = (url: string) => new URL(url).hostname.replace(/^www\./, '');
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ko-KR');
export function selectWebsites(sites: readonly Website[], filters: WebsiteFilters, favorites: ReadonlySet<string>) {
    const terms = normalize(filters.query).trim().split(/\s+/).filter(Boolean);
    return sites.filter(site => {
        const text = normalize([site.title, site.description, websiteDomain(site.url), ...site.tags].join(' '));
        // Search words and selected tags all apply together, along with category and favorites.
        return terms.every(term => text.includes(term))
            && (!filters.category || site.category === filters.category)
            && filters.tags.every(tag => site.tags.includes(tag))
            && (!filters.favoritesOnly || favorites.has(site.id));
    }).sort((a, b) => filters.sort === 'name'
        ? a.title.localeCompare(b.title, 'ko-KR') || a.id.localeCompare(b.id)
        : b.addedAt.localeCompare(a.addedAt) || a.title.localeCompare(b.title, 'ko-KR'));
}
export function parseFavorites(raw: string | null, sites: readonly Website[]): Set<string> {
    // Ignore malformed storage and IDs removed from the catalog; storage is never trusted as input.
    try {
        const parsed: unknown = JSON.parse(raw ?? '[]');
        const known = new Set(sites.map(site => site.id));
        return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && known.has(id)) : []);
    } catch { return new Set(); }
}
