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
    const message = element();
    let retry: () => Promise<void>;
    const fit = { ...element(), addEventListener(_event: string, handler: () => Promise<void>) { retry = handler; } };
    const form = { elements: { namedItem: () => ({ value: '' }) }, addEventListener() {} };
    const root = {
        dataset: { lang: 'en' },
        querySelector(selector: string) {
            if (selector === 'form') return form;
            if (selector === '#restaurant-map') return canvas;
            if (selector === '[data-fit]') return fit;
            if (selector === '[data-map-message]') return message;
            return element();
        },
        querySelectorAll: () => [],
    };
    let hasView = false;
    const map = {
        fitBounds() { hasView = true; },
        zoomControl: { setPosition() {} },

        closePopup() {}, invalidateSize() {}, remove() {},
    };
    const marker = { bindPopup() { events.push('popup'); }, on() {}, addTo() { assert.ok(hasView); events.push('marker'); } };
    const leaflet = {
        map: () => map, latLngBounds: (points: unknown) => points,
        tileLayer: () => ({ on() {}, addTo() {} }),
        marker: () => marker, divIcon() {},
    };
    let attempts = 0;
    const dependencies = {
        document: { querySelector: () => root, createElement: element },
        window: { matchMedia: () => ({ matches: true }) },
        restaurants: [row, { ...row, id: 'second', latitude: 49 }], uniqueRestaurants: (rows: unknown) => rows, localizedRestaurants: (rows: unknown) => rows,
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
    return { events, message, retry: () => retry!(), attempts: () => attempts };
}

test('the top map loads automatically and displays every recorded location', async () => {
    const page = setup();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(page.events.filter(event => event === 'marker').length, 2);
    assert.equal(page.events.filter(event => event === 'popup').length, 2);
    assert.equal(page.attempts(), 1);
    await page.retry();
    assert.equal(page.attempts(), 1);
    assert.equal(page.events.filter(event => event === 'marker').length, 2);
});

test('Show all retries after a failed automatic map import', async () => {
    const page = setup(true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(page.message.textContent, 'error');
    await page.retry();
    assert.equal(page.attempts(), 2);
    assert.equal(page.events.filter(event => event === 'marker').length, 2);
});
