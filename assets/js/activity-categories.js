// Shared by source metadata and the gallery; keep legacy category links working.
export const activityCategories = ['展览', '快闪', '演出', '其他', '观影会'];
const aliases = {'展会':'展览','漫展':'展览','快闪与联动':'快闪','演出与聚会':'演出','音乐演出':'演出','主题餐厅聚餐':'其他','校招宣讲':'其他'};
export function normalizeActivityCategory(value) { return aliases[value] || value; }
export function activityCategory(event) {
 const category = normalizeActivityCategory(event.category);
 return activityCategories.includes(category) ? category : '其他';
}

export const activityCategoryDetail = event => event.categoryDetail || event.category;
export const activityCategoryTags = event => [...new Set((event.categories || [activityCategory(event)]).map(normalizeActivityCategory))];
export const hasActivityCategory = (event, category) => activityCategoryTags(event).includes(normalizeActivityCategory(category));
export function validateActivityCategories(event) {
 if (event.categories !== undefined && (!Array.isArray(event.categories) || !event.categories.length || event.categories.some(value => !activityCategories.includes(value)) || new Set(event.categories).size !== event.categories.length || !event.categories.includes(activityCategory(event)))) throw new Error('categories 必须为非空、无重复的有效类型数组，并包含 category 主类型');
 return activityCategoryTags(event);
}
export function activityCategoryLabel(event) {
 const label=activityCategoryTags(event).join(' / '), detail=activityCategoryDetail(event);
 return label+(activityCategory(event)==='其他'&&detail&&detail!=='其他'?' · '+detail:'');
}
