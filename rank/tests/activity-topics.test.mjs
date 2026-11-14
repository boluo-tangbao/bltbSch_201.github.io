import test from 'node:test';
import assert from 'node:assert/strict';
import { activityTopics, hasActivityTopic, validateActivityTopics } from '../../assets/js/activity-topics.js';
test('old topic and new multi-topic metadata resolve consistently', () => {
 assert.deepEqual(validateActivityTopics({topic:'acg'}), ['acg']);
 assert.deepEqual(validateActivityTopics({topics:['acg','art']}), ['acg','art']);
 const concert={id:'concert',topic:'acg',topics:['acg','art']};
 assert.ok(hasActivityTopic(concert,'acg')); assert.ok(hasActivityTopic(concert,'art'));
 assert.equal([concert].filter(event=>hasActivityTopic(event,'acg')||hasActivityTopic(event,'art')).length,1);
 assert.deepEqual(activityTopics({topics:['art','art']}),['art']);
});
test('metadata rejects missing, empty, duplicate, unknown and conflicting tags', () => {
 for(const event of [{},{topics:[]},{topics:'acg'},{topics:['acg','acg']},{topics:['bad']},{topic:'bad'},{topic:'art',topics:['acg']}])assert.throws(()=>validateActivityTopics(event));
});
