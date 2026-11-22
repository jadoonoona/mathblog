import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { websites } from '../src/data/websites.ts';
import { parseFavorites, selectWebsites, websiteDomain, type WebsiteFilters } from '../src/lib/websites.ts';
const defaults: WebsiteFilters = { query: '', category: '', tags: [], favoritesOnly: false, sort: 'newest' };

test('catalog search, category, all selected tags and favorites intersect', () => {
    const favorites = new Set(['desmos', 'geogebra', 'fred']);
    const select = (overrides: Partial<WebsiteFilters>) => selectWebsites(websites, { ...defaults, ...overrides }, favorites).map(site => site.id);
    assert.deepEqual(select({ query: 'DESMOS.COM 그래프', category: '수학·통계', tags: ['시각화', '학습'], favoritesOnly: true }), ['desmos']);
    assert.deepEqual(select({ category: '개발', favoritesOnly: true }), []);
    assert.deepEqual(select({ query: '  경제 시계열  ', tags: ['데이터'] }), ['fred']);
    assert.deepEqual(select({ query: 'ＭＤＮ' }), ['mdn']);
    assert.deepEqual(select({ tags: ['오픈소스', '협업'] }), ['github']);
    assert.deepEqual(select({ favoritesOnly: true }), ['desmos', 'geogebra', 'fred']);
});

test('sort is deterministic, changes no source order, and empty favorites produces no matches', () => {
    const before = websites.map(site => site.id);
    const named = selectWebsites(websites, { ...defaults, sort: 'name' }, new Set());
    assert.equal(named[0].id, 'astro');
    assert.equal(selectWebsites(websites, defaults, new Set())[0].id, 'our-trip-plan');
    assert.deepEqual(websites.map(site => site.id), before);
    assert.deepEqual(selectWebsites(websites, { ...defaults, favoritesOnly: true }, new Set()), []);
});

test('favorites tolerate corrupt storage and prune removed or invalid IDs', () => {
    for (const raw of [null, 'broken', '{}', 'null', '42']) assert.deepEqual([...parseFavorites(raw, websites)], []);
    assert.deepEqual([...parseFavorites('["desmos","desmos","removed",7,null,"fred"]', websites)], ['desmos', 'fred']);
});

test('catalog entries have unique IDs, safe URLs, valid dates and available local thumbnails', () => {
    assert.equal(new Set(websites.map(site => site.id)).size, websites.length);
    for (const site of websites) {
        assert.equal(new URL(site.url).protocol, 'https:');
        assert.ok(websiteDomain(site.url));
        assert.match(site.addedAt, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(new Date(site.addedAt).toISOString().slice(0, 10), site.addedAt);
        assert.ok(site.title && site.description && site.category);
        assert.ok(site.tags.length);
        if (site.thumbnail && !site.thumbnail.startsWith('http')) assert.ok(existsSync(`public/${site.thumbnail}`), site.thumbnail);
    }
});
