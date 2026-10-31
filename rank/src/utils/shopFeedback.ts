import type { Place, ShopDirectory } from '../types/index.ts'
import { shopDisplayStatus } from './shopDirectory.ts'

export const shopFeedbackTypes = ['搬迁', '闭店', '楼层变化', '营业状态', '其他信息'] as const
export type ShopFeedbackType = typeof shopFeedbackTypes[number]
export interface ShopFeedbackContext { placeId: string; placeName: string; city: string; shopName: string; floor?: string }

export function shopFeedbackUrl(base: string, placeId: string, shopName: string) {
  return `${base}qa/?${new URLSearchParams({ place: placeId, shop: shopName })}#suggest-title`
}

export function resolveShopFeedback(search: string, places: Place[], directories: Record<string, ShopDirectory>): ShopFeedbackContext | undefined {
  const params = new URLSearchParams(search)
  const place = places.find(place => place.published && place.id === params.get('place'))
  if (!place) return undefined
  const shop = directories[place.id]?.shops.find(shop => shop.name === params.get('shop') && (shopDisplayStatus(shop) !== 'closed' || shop.inactive))
  if (!shop) return undefined
  return { placeId: place.id, placeName: place.name, city: place.city, shopName: shop.name, floor: shop.floor }
}

export function shopFeedbackBody(context: ShopFeedbackContext, type: ShopFeedbackType, pageUrl: string, details = '') {
  return `店铺：${context.shopName}\n所在逛店地点：${context.city} · ${context.placeName}\n当前记录位置：${context.floor || '未注明'}\n变化类型：${type}\n页面链接：${pageUrl}\n\n变化情况与信息来源：\n${details.trim()}`
}
