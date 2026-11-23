import { localizedWebsites } from '../data/websites';
import { FAVORITES_KEY, parseFavorites, selectWebsites, type WebsiteFilters } from '../lib/websites';

import { websiteText } from '../data/websites-i18n';

const root = document.querySelector<HTMLElement>('[data-catalog]');
if (root) {
    const lang = root.dataset.lang === 'en' ? 'en' : 'ko';
    const websites = localizedWebsites(lang);
    const t = (text: string) => websiteText(lang, text);
    const search = root.querySelector<HTMLInputElement>('#website-search')!;
    const sort = root.querySelector<HTMLSelectElement>('#website-sort')!;
    const favoritesOnly = root.querySelector<HTMLInputElement>('#website-favorites')!;
    const grid = root.querySelector<HTMLElement>('[data-grid]')!;
    const chips = root.querySelector<HTMLElement>('[data-chips]')!;
    const cards = new Map([...root.querySelectorAll<HTMLElement>('[data-site-id]')].map(card => [card.dataset.siteId!, card]));
    const storageStatus = root.querySelector<HTMLElement>('[data-storage-status]')!;
    let favorites = new Set<string>();
    try { favorites = parseFavorites(localStorage.getItem(FAVORITES_KEY), websites); }
    catch { storageStatus.textContent = t('브라우저 저장소를 사용할 수 없어 즐겨찾기는 현재 화면에서만 유지됩니다.'); }
    const filters: WebsiteFilters = { query: '', category: '', tags: [], favoritesOnly: false, sort: 'newest' };

    function render() {
        const selected = selectWebsites(websites, filters, favorites);
        const ids = new Set(selected.map(site => site.id));
        for (const [id, card] of cards) {
            card.hidden = !ids.has(id);
            card.querySelector('[data-favorite]')!.setAttribute('aria-pressed', String(favorites.has(id)));
        }
        // Move nodes only when ordering changes so saving a favorite does not discard keyboard focus.
        const order = selectWebsites(websites, { ...filters, query: '', category: '', tags: [], favoritesOnly: false }, favorites).map(site => site.id);
        if ([...grid.children].map(card => (card as HTMLElement).dataset.siteId).join('|') !== order.join('|')) {
            order.forEach(id => grid.append(cards.get(id)!));
        }
        root!.querySelector('[data-result-count]')!.textContent = `${t('검색 결과')} ${selected.length}${lang === 'ko' ? '개' : ''}`;
        (root!.querySelector('[data-empty]') as HTMLElement).hidden = selected.length !== 0;
        chips.replaceChildren();
        const addChip = (label: string, clear: () => void) => {
            const button = document.createElement('button');
            button.type = 'button'; button.textContent = `${label} ×`; button.setAttribute('aria-label', `${t('필터 해제')}: ${label}`);
            button.addEventListener('click', () => { clear(); render(); search.focus(); });
            chips.append(button);
        };
        if (filters.query.trim()) addChip(`${t('검색')}: ${filters.query.trim()}`, () => { filters.query = ''; search.value = ''; });
        if (filters.category) addChip(filters.category, () => { filters.category = ''; root!.querySelector<HTMLInputElement>('input[name="website-category"][value=""]')!.checked = true; });
        filters.tags.forEach(tag => addChip(tag, () => {
            filters.tags = filters.tags.filter(value => value !== tag);
            root!.querySelectorAll<HTMLInputElement>('input[name="website-tag"]').forEach(input => { if (input.value === tag) input.checked = false; });
        }));
        if (filters.favoritesOnly) addChip(t('즐겨찾기'), () => { filters.favoritesOnly = false; favoritesOnly.checked = false; });
        chips.hidden = chips.childElementCount === 0;
    }
    search.addEventListener('input', () => { filters.query = search.value; render(); });
    sort.addEventListener('change', () => { filters.sort = sort.value === 'name' ? 'name' : 'newest'; render(); });
    root.querySelectorAll<HTMLInputElement>('input[name="website-category"]').forEach(input => input.addEventListener('change', () => { filters.category = input.value; render(); }));
    root.querySelectorAll<HTMLInputElement>('input[name="website-tag"]').forEach(input => input.addEventListener('change', () => {
        filters.tags = [...root.querySelectorAll<HTMLInputElement>('input[name="website-tag"]:checked')].map(tag => tag.value); render();
    }));
    favoritesOnly.addEventListener('change', () => { filters.favoritesOnly = favoritesOnly.checked; render(); });
    root.querySelectorAll('[data-reset]').forEach(button => button.addEventListener('click', () => {
        Object.assign(filters, { query: '', category: '', tags: [], favoritesOnly: false, sort: 'newest' });
        search.value = ''; sort.value = 'newest'; favoritesOnly.checked = false;
        root!.querySelectorAll<HTMLInputElement>('input[name="website-category"]').forEach(input => { input.checked = input.value === ''; });
        root!.querySelectorAll<HTMLInputElement>('input[name="website-tag"]').forEach(input => { input.checked = false; });
        render(); search.focus();
    }));
    root.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach(button => button.addEventListener('click', () => {
        const id = button.dataset.favorite!;
        favorites.has(id) ? favorites.delete(id) : favorites.add(id);
        try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); }
        catch { storageStatus.textContent = t('즐겨찾기를 저장하지 못했습니다. 현재 화면에서는 사용할 수 있습니다.'); }
        // A removed favorite disappears in favorites-only mode. Keep focus on an available control.
        const losesFocus = filters.favoritesOnly && !favorites.has(id);
        render(); if (losesFocus) favoritesOnly.focus();
    }));
    window.addEventListener('storage', event => {
        if (event.key === FAVORITES_KEY || event.key === null) { favorites = parseFavorites(event.newValue, websites); render(); }
    });
    // Catch cached failures as well as errors arriving after hydration; the text fallback is already below the image.
    root.querySelectorAll<HTMLImageElement>('.website-preview img').forEach(image => {
        const fallback = () => { image.hidden = true; };
        image.addEventListener('error', fallback);
        if (image.complete && image.naturalWidth === 0) fallback();
    });
    const details = root.querySelector<HTMLDetailsElement>('.catalog-filters')!;
    const mobile = matchMedia('(max-width: 700px)');
    const resize = () => { details.open = !mobile.matches; };
    mobile.addEventListener('change', resize); resize();
    root.querySelectorAll<HTMLElement>('[data-controls]').forEach(control => { control.hidden = false; });
    render();
}
