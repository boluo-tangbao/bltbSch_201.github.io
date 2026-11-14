// Shared by source metadata and the gallery; keep legacy category links working.
export const activityCategories = ['展览', '快闪', '演出', '其他'];
const aliases = {'展会':'展览','漫展':'展览','快闪与联动':'快闪','演出与聚会':'演出','音乐演出':'演出','主题餐厅聚餐':'其他','校招宣讲':'其他'};
export function normalizeActivityCategory(value) { return aliases[value] || value; }
export function activityCategory(event) {
 // The old combined category included this screening; it is not a performance.
 if (event.id === 'euphonium-screening-2026') return '其他';
 const category = normalizeActivityCategory(event.category);
 return activityCategories.includes(category) ? category : '其他';
}

export const activityCategoryDetail = event => event.id === 'euphonium-screening-2026' ? '观影' : (event.categoryDetail || event.category);
