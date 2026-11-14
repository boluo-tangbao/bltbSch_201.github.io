export const activityTopicLabels = {acg:'二次元',sports:'体育',art:'艺术',travel:'旅行',life:'生活',other:'其他'};
export function activityTopics(event) {
 const values = Array.isArray(event.topics) ? event.topics : [event.topic];
 return [...new Set(values.filter(value => Object.hasOwn(activityTopicLabels, value)))];
}
export const hasActivityTopic = (event, topic) => activityTopics(event).includes(topic);
export function validateActivityTopics(event) {
 if (event.topic !== undefined && !Object.hasOwn(activityTopicLabels, event.topic)) throw new Error('topic 应为有效的主题');
 if (event.topics !== undefined && (!Array.isArray(event.topics) || !event.topics.length || event.topics.some(value => !Object.hasOwn(activityTopicLabels, value)) || new Set(event.topics).size !== event.topics.length)) throw new Error('topics 必须为非空、无重复的有效主题数组');
 if (!activityTopics(event).length) throw new Error('请填写 topics 主题标签或旧 topic');
 if (event.topics && event.topic && !event.topics.includes(event.topic)) throw new Error('旧 topic 应包含在 topics 中');
 return activityTopics(event);
}
