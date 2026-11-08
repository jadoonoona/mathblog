import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restaurants, stats, hasCoordinates, filterRestaurants, uniqueRestaurants, localizedRestaurants, recommendationSettings, type Restaurant } from '../src/data/korean-restaurants/index.ts';
const fixture: Restaurant = { id: 'test-only', name: '가상 테스트 식당', countryCode: 'XX', country: '가상국', city: '가상도시', recommendation: 'pending', visits: [{date:'2000-01', menus:['테스트찌개']}, {date:'2000-02'}] };
test('production excludes fixtures and repeated visits do not inflate restaurant statistics', () => {
    assert.ok(restaurants.every(r => r.id !== 'fictional-fixture')); 
    assert.deepEqual(stats([]), {countries:0, cities:0, restaurants:0});
    assert.deepEqual(stats([fixture, fixture]), {countries:1, cities:1, restaurants:1});
    assert.equal(uniqueRestaurants([fixture, fixture]).length, 1);
    assert.deepEqual(stats([fixture, {...fixture,id:'other',countryCode:'YY'}]), {countries:2,cities:2,restaurants:2});
});
test('missing, non-finite and out-of-range coordinates stay searchable but off the map', () => {
    for (const coords of [{}, {latitude:NaN,longitude:0}, {latitude:0,longitude:Infinity}, {latitude:91,longitude:0}, {latitude:0,longitude:-181}]) {
        const row = {...fixture,...coords};
        assert.equal(hasCoordinates(row), false);
        assert.equal(filterRestaurants([row],'테스트찌개').length,1);
    }
    assert.equal(hasCoordinates({...fixture,latitude:0,longitude:0}), true);
});
test('name, city, country and menus can be searched with combined filters and cleared', () => {
    for (const q of ['가상 테스트','가상도시','가상국',' 테스트찌개 ']) assert.equal(filterRestaurants([fixture],q,'XX','pending').length,1);
    assert.equal(filterRestaurants([fixture], '', 'YY').length,0);
    assert.equal(filterRestaurants([fixture], '', '', 'revisit').length,0);
    assert.equal(filterRestaurants([fixture], '없는 검색어').length,0);
    assert.equal(filterRestaurants([fixture]).length,1);
    assert.equal(fixture.visits[0].date, '2000-01');
});

test('English overrides preserve shared identity and coordinates, with original fallback', () => {
    const row = {...fixture, latitude: 0, longitude: 0, translations: {en: {name:'Fictional test restaurant', city:'Test city'}}};
    const [english] = localizedRestaurants([row], 'en');
    assert.equal(english.name, 'Fictional test restaurant');
    assert.equal(english.id, row.id);
    assert.equal(english.latitude, 0);
    assert.equal(english.country, row.country);
    assert.equal(localizedRestaurants([row], 'ko')[0].name, row.name);
    assert.equal(filterRestaurants([english], 'Test city').length, 1);
    assert.equal(recommendationSettings('en').revisit.label, 'Would go again');
    assert.equal(recommendationSettings('en').revisit.color, recommendationSettings('ko').revisit.color);
});
