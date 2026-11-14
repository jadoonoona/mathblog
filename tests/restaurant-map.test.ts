import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Exercise the real browser controller with an asynchronous map loader and DOM doubles.
const source = stripTypeScriptTypes(readFileSync(new URL('../src/scripts/restaurant-journal.ts', import.meta.url), 'utf8'))
    .replace(/^import .*;\n/gm, '')
    .replace(/import\(/g, 'importModule(');

function setup(failFirst = false) {
    const events: string[] = [];
    const row = { id: 'restaurant', name: 'Restaurant', recommendation: 'revisit', latitude: 48, longitude: 2, country: 'France', city: 'Paris' };
    const element = () => ({
        hidden: false, disabled: false, textContent: '', dataset: {},
        append() {}, setAttribute() {}, addEventListener() {},
        scrollIntoView() { events.push('scroll'); }, focus() { events.push('focus'); },
    });
    const canvas = { ...element(), querySelector: () => element() };
    const section = element();
    const message = element();
    let click: () => Promise<void>;
    const button = { ...element(), dataset: { showMap: row.id }, addEventListener(_event: string, handler: () => Promise<void>) { click = handler; } };
    const form = { elements: { namedItem: () => ({ value: '' }) }, addEventListener() {} };
    const root = {
        dataset: { lang: 'en' },
        querySelector(selector: string) {
            if (selector === 'form') return form;
            if (selector === '#restaurant-map') return canvas;
            if (selector === '.journal-map-section') return section;
            if (selector === '[data-map-message]') return message;
            return element();
        },
        querySelectorAll: (selector: string) => selector === '[data-show-map]' ? [button] : [],
    };
    let hasView = false;
    const map = {
        fitBounds() { hasView = true; },
        zoomControl: { setPosition() {} },
        addLayer() { assert.ok(hasView, 'set the map view before attaching the cluster'); },
        closePopup() {}, invalidateSize() {}, remove() {},
    };
    const marker = { bindPopup() {}, on() {}, openPopup() { events.push('popup'); } };
    const cluster = { clearLayers() {}, addLayer() {}, zoomToShowLayer(_marker: unknown, done: () => void) { done(); } };
    const leaflet = {
        map: () => map, latLngBounds: (points: unknown) => points,
        tileLayer: () => ({ on() {}, addTo() {} }),
        markerClusterGroup: () => cluster, marker: () => marker, divIcon() {},
    };
    let attempts = 0;
    const dependencies = {
        document: { querySelector: () => root, createElement: element },
        window: { matchMedia: () => ({ matches: true }) },
        IntersectionObserver: class { observe() {} disconnect() {} },
        restaurants: [row], uniqueRestaurants: (rows: unknown) => rows, localizedRestaurants: (rows: unknown) => rows,
        recommendationSettings: () => ({ revisit: { label: 'Would go again', symbol: '★', color: '#25834b' } }),
        restaurantSymbol: () => '★', hasCoordinates: () => true,
        tileProvider: { maxZoom: 19, url: '', attribution: '' }, assetUrl: (path: string) => path,
        journalText: () => ({ loading: 'loading', mapError: 'error', locations: () => 'locations', action: () => 'Read review' }),
        console: { error() {} },
        async importModule(name: string) {
            if (name === 'leaflet') {
                attempts++;
                if (failFirst && attempts === 1) throw new Error('temporary loading failure');
                return { default: leaflet };
            }
            return {};
        },
    };
    new Function(...Object.keys(dependencies), source)(...Object.values(dependencies));
    return { events, message, click: () => click!(), attempts: () => attempts };
}

test('Show on map loads the map, scrolls and opens the selected restaurant popup', async () => {
    const page = setup();
    await page.click();
    assert.equal(page.events[0], 'scroll');
    assert.ok(page.events.includes('popup'));
    assert.ok(page.events.includes('focus'));
    assert.equal(page.attempts(), 1);
});

test('Show on map retries after a failed map import', async () => {
    const page = setup(true);
    await page.click();
    assert.equal(page.message.textContent, 'error');
    await page.click();
    assert.equal(page.attempts(), 2);
    assert.ok(page.events.includes('popup'));
});
