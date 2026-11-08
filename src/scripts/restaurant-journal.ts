import { restaurants, uniqueRestaurants, localizedRestaurants, recommendationSettings, filterRestaurants, hasCoordinates, tileProvider, assetUrl } from '../data/korean-restaurants';
import { journalText } from '../data/korean-restaurants/i18n';
import type * as Leaflet from 'leaflet';
const root = document.querySelector<HTMLElement>('.restaurant-journal');
if (root) {
    const lang = root.dataset.lang === 'en' ? 'en' : 'ko';
    const t = journalText(lang);
    const recommendations = recommendationSettings(lang);
    const rows = localizedRestaurants(uniqueRestaurants(restaurants), lang);
    const form = root.querySelector<HTMLFormElement>('form')!;
    const query = form.elements.namedItem('query') as HTMLInputElement;
    const country = form.elements.namedItem('country') as HTMLSelectElement;
    const recommendation = form.elements.namedItem('recommendation') as HTMLSelectElement;
    const result = root.querySelector<HTMLElement>('.journal-results')!;
    const empty = root.querySelector<HTMLElement>('[data-empty]')!;
    const message = root.querySelector<HTMLElement>('[data-map-message]')!;
    const canvas = root.querySelector<HTMLElement>('#restaurant-map')!;
    const fit = root.querySelector<HTMLButtonElement>('[data-fit]')!;
    const cards = [...root.querySelectorAll<HTMLElement>('[data-restaurant-id]')];
    let filtered = rows;
    let L: typeof Leaflet;
    let map: Leaflet.Map | undefined;
    let cluster: Leaflet.MarkerClusterGroup | undefined;
    let loading: Promise<void> | undefined;
    const markers = new Map<string, Leaflet.Marker>();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function select(id: string, scroll = false) {
        cards.forEach(card => card.classList.toggle('is-selected', card.dataset.restaurantId === id));
        if (scroll) {
            const card = cards.find(card => card.dataset.restaurantId === id);
            card?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
            card?.focus({ preventScroll: true });
        }
    }
    function fitResults() {
        if (!map || !L) return;
        const points = filtered.filter(hasCoordinates).map(r => [r.latitude!, r.longitude!] as [number, number]);
        if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 12, animate: false });
    }
    function updateMarkers() {
        if (!map || !cluster) return;
        map.closePopup();
        cluster.clearLayers();
        markers.clear();
        const located = filtered.filter(hasCoordinates);
        canvas.hidden = !located.length;
        fit.disabled = !located.length;
        if (!located.length) {
            message.textContent = filtered.length ? t.noResultLocations : t.noMapResults;
            return;
        }
        message.textContent = t.locations(located.length);
        map.invalidateSize();
        located.forEach(r => {
            const state = recommendations[r.recommendation];
            const marker = L.marker([r.latitude!, r.longitude!], {
                title: `${r.name} · ${state.label}`, alt: `${r.name} · ${state.label}`, keyboard: true,
                icon: L.divIcon({ className: 'journal-marker', html: `<span class="journal-pin" style="background:${state.color}">${state.symbol}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }),
            });
            const popup = document.createElement('div');
            popup.className = 'journal-popup';
            const heading = document.createElement('strong');
            heading.textContent = r.name;
            popup.append(heading);
            const location = document.createElement('p');
            location.textContent = `${r.country} · ${r.city} · ${state.label}`;
            popup.append(location);
            const photo = r.photos?.[0];
            if (photo) {
                const img = document.createElement('img');
                img.src = assetUrl(photo.src); img.alt = photo.alt; img.loading = 'lazy';
                popup.append(img);
            }
            if (r.summary) { const p = document.createElement('p'); p.textContent = r.summary; popup.append(p); }
            const button = document.createElement('button');
            button.type = 'button'; button.textContent = t.review; button.setAttribute('aria-label', t.action(r.name, t.review));
            button.addEventListener('click', () => select(r.id, true));
            popup.append(button);
            marker.bindPopup(popup, { maxWidth: 260, minWidth: 180, maxHeight: 290 });
            marker.on('click', () => select(r.id));
            cluster!.addLayer(marker);
            markers.set(r.id, marker);
        });
        fitResults();
    }
    async function loadMap() {
        if (map || !rows.some(hasCoordinates)) return;
        if (loading) return loading;
        loading = (async () => {
            message.textContent = t.loading;
            try {
                // Browser-only import keeps Leaflet's window access out of SSR.
                const module = await import('leaflet');
                L = module.default ?? module;
                // Markercluster augments the same Leaflet instance.
                (window as Window & { L?: typeof Leaflet }).L = L;
                await Promise.all([import('leaflet/dist/leaflet.css'), import('leaflet.markercluster/dist/MarkerCluster.css'), import('leaflet.markercluster/dist/MarkerCluster.Default.css')]);
                await import('leaflet.markercluster');
                canvas.hidden = false;
                map = L.map(canvas, { scrollWheelZoom: false, maxZoom: tileProvider.maxZoom });
                map.zoomControl.setPosition('topright');
                const tiles = L.tileLayer(tileProvider.url, { attribution: tileProvider.attribution, maxZoom: tileProvider.maxZoom });
                tiles.on('tileerror', () => { message.textContent = t.tileError; });
                tiles.addTo(map);
                cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 48, animate: !reduced });
                map.addLayer(cluster);
                updateMarkers();
                const zoomIn = canvas.querySelector('.leaflet-control-zoom-in');
                const zoomOut = canvas.querySelector('.leaflet-control-zoom-out');
                zoomIn?.setAttribute('aria-label', t.zoomIn);
                zoomOut?.setAttribute('aria-label', t.zoomOut);
            } catch (error) {
                map?.remove(); map = undefined;
                canvas.hidden = true; fit.disabled = true;
                message.textContent = t.mapError;
                console.error('Restaurant map could not load', error);
            }
        })();
        return loading;
    }
    function applyFilters() {
        filtered = filterRestaurants(rows, query.value, country.value, recommendation.value);
        const ids = new Set(filtered.map(r => r.id));
        cards.forEach(card => { card.hidden = !ids.has(card.dataset.restaurantId!); card.classList.remove('is-selected'); });
        result.textContent = t.results(filtered.length, rows.length);
        empty.hidden = filtered.length > 0;
        if (rows.length) empty.textContent = t.noResults;
        updateMarkers();
    }
    form.addEventListener('input', applyFilters);
    form.addEventListener('change', applyFilters);
    form.addEventListener('reset', () => { requestAnimationFrame(applyFilters); });
    fit.addEventListener('click', fitResults);
    root.querySelectorAll<HTMLButtonElement>('[data-show-map]').forEach(button => {
        button.addEventListener('click', async () => {
            await loadMap();
            const id = button.dataset.showMap!;
            const marker = markers.get(id);
            if (!map || !marker || !cluster) return;
            select(id);
            canvas.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' });
            cluster.zoomToShowLayer(marker, () => {
                marker.openPopup();
                canvas.focus({ preventScroll: true });
            });
        });
    });
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void loadMap(); }
        }, { rootMargin: '200px' });
        observer.observe(root.querySelector('.journal-map-section')!);
    } else { void loadMap(); }
}
