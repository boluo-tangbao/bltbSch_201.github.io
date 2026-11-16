import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateTravelMap,personalPoints,referencePoints,clusterPoints,fitBounds,project} from '../../assets/js/travel-map-data.js';
const read=path=>JSON.parse(readFileSync(new URL('../../'+path,import.meta.url)));
const catalog=read('assets/data/pilgrimage-map.json'),config=read('content/pilgrimage/records.json');
test('Japan atlas has source-backed regional entries and licensed external references',()=>{
 assert.equal(validateTravelMap(catalog,config.cities.map(c=>c.id)),true);
 const bad=structuredClone(catalog);bad.references[0].coordinates[0]+=0.001;
 assert.throws(()=>validateTravelMap(bad,config.cities.map(c=>c.id)),/出处坐标不匹配/);
 const boundary=read('assets/data/japan-boundary.geojson');assert.equal(boundary.type,'FeatureCollection');assert.equal(boundary.features.length,1);assert.equal(boundary.features[0].properties.name,'Japan');
});
test('External reference filters never turn into personal records or photos',()=>{
 const rows=config.records.map(row=>({...row,photos:2})),personal=personalPoints(catalog,rows),references=referencePoints(catalog);
 assert.equal(personal.length,4);assert.equal(personal.reduce((n,p)=>n+p.photos,0),22);assert.equal(references.length,3);
 assert.ok(references.every(p=>p.kind==='reference'&&!p.records&&!p.photos));
 assert.equal(referencePoints(catalog,{work:'MyGO'}).length,0);assert.equal(referencePoints(catalog,{city:'tokyo'}).length,0);
 assert.equal(referencePoints(catalog,{q:'大吉山'}).length,2);assert.equal(referencePoints(catalog,{work:'吹响吧！上低音号'}).length,3);
 assert.equal(personalPoints(catalog,rows.filter(r=>r.works.includes('MyGO')))[0].records.length,1);
});
test('Geographic fit and marker grouping preserve every point and separate neighbors on zoom',()=>{
 const points=[...catalog.areas,...catalog.references],box=fitBounds(points,1.4);
 for(const point of points){const [x,y]=project(point.coordinates);assert.ok(x>=box.x&&x<=box.x+box.width);assert.ok(y>=box.y&&y<=box.y+box.height);}
 const groups=clusterPoints(points,box,700,500);assert.equal(groups.flatMap(g=>g.items).length,points.length);assert.ok(groups.some(g=>g.items.length>1));
 const local=fitBounds(catalog.references,1.4,0.008);assert.equal(clusterPoints(catalog.references,local,700,500).length,catalog.references.length);
});
