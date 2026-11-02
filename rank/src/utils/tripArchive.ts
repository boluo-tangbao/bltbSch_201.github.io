import type { Place, ShopDirectory } from '../types/index.ts'
import { readTripEntries, resolveTripStops, tripEntryKey, type TripEntry } from './tripPlan.ts'
import { limitedPhase, shopDisplayStatus, shopStatusLabel, shopCalendarDate } from './shopDirectory.ts'

export const archiveKey = 'tangbao-trip-archive-encrypted-v1'
export const routingKey = 'tangbao-trip-routing-session-v1'
export const maxArchiveBytes = 2 * 1024 * 1024
const iterations = 600000
const format = 'tangbao-private-trips'
const encoder = new TextEncoder()
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max
const safeId = (v: string) => v.length > 0 && v.length <= 120 && !['__proto__', 'constructor', 'prototype'].includes(v)
export interface TripPreferences { modes: Record<string, 'auto' | 'walk' | 'bus' | 'car'>; visits: Record<string, { minutes: number; close?: string }> }
export interface SavedTrip { id: string; name: string; savedAt: string; entries: TripEntry[]; labels: string[]; preferences: TripPreferences }
export interface EncryptedArchive { format: string; version: 1; iterations: number; salt: string; iv: string; data: string }

export function readTripPreferences(value: unknown): TripPreferences {
  const source = record(value) ? value : {}
  const modes: TripPreferences['modes'] = {}, visits: TripPreferences['visits'] = {}
  if (record(source.modes)) for (const [key, mode] of Object.entries(source.modes).slice(0, 200)) {
    try {
      const pair = JSON.parse(key)
      if (key.length <= 500 && Array.isArray(pair) && pair.length === 2 && pair.every(id => typeof id === 'string' && safeId(id)) && ['auto', 'walk', 'bus', 'car'].includes(String(mode))) modes[key] = mode as 'auto' | 'walk' | 'bus' | 'car'
    } catch { /* Untrusted or obsolete preferences are optional. */ }
  }
  if (record(source.visits)) for (const [key, visit] of Object.entries(source.visits).slice(0, 120)) {
    if (safeId(key) && record(visit) && typeof visit.minutes === 'number' && Number.isFinite(visit.minutes) && visit.minutes >= 0 && visit.minutes <= 240) {
      visits[key] = { minutes: visit.minutes, ...(typeof visit.close === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(visit.close) ? { close: visit.close } : {}) }
    }
  }
  return { modes, visits }
}

export function sessionTripPreferences(): TripPreferences {
  try { return readTripPreferences(JSON.parse(sessionStorage.getItem(routingKey) || '{}')) } catch { return readTripPreferences(null) }
}

function validateTrips(value: unknown): SavedTrip[] {
  if (!Array.isArray(value) || value.length > 20) throw new Error('备份最多包含20个行程。')
  const ids = new Set<string>()
  return value.map(trip => {
    if (!record(trip) || !text(trip.id, 80) || !safeId(trip.id) || ids.has(trip.id) || !text(trip.name, 60) || !trip.name.trim() || !text(trip.savedAt, 30) || !Number.isFinite(Date.parse(trip.savedAt)) || !Array.isArray(trip.entries) || !trip.entries.length || trip.entries.length > 120 || !Array.isArray(trip.labels) || trip.labels.length !== trip.entries.length || !trip.labels.every(label => text(label, 200))) throw new Error('行程文件格式不正确。')
    const entries = readTripEntries(JSON.stringify(trip.entries))
    if (entries.length !== trip.entries.length || entries.some(entry => !safeId(entry.placeId) || (entry.shopName && entry.shopName.length > 160) || (entry.custom && (!safeId(entry.custom.id) || entry.custom.city.length > 80)))) throw new Error('行程条目不完整或超出限制。')
    ids.add(trip.id)
    return { id: trip.id, name: trip.name.trim(), savedAt: trip.savedAt, entries, labels: trip.labels as string[], preferences: readTripPreferences(trip.preferences) }
  })
}

const base64 = (bytes: Uint8Array) => {
  let value = ''
  for (let i = 0; i < bytes.length; i += 8192) value += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return btoa(value)
}
const bytes = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0))

export function parseArchive(value: string): EncryptedArchive {
  if (encoder.encode(value).length > maxArchiveBytes) throw new Error('加密备份不能超过2MB。')
  let data: unknown
  try { data = JSON.parse(value) } catch { throw new Error('请选择本站导出的加密行程文件。') }
  if (!record(data) || data.format !== format || data.version !== 1 || data.iterations !== iterations || !text(data.salt, 24) || !text(data.iv, 16) || !text(data.data, maxArchiveBytes) || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.data)) throw new Error('不支持的加密行程格式。')
  try { if (bytes(data.salt).length !== 16 || bytes(data.iv).length !== 12 || bytes(data.data).length < 16) throw new Error() } catch { throw new Error('加密行程文件已损坏。') }
  return { format, version: 1, iterations, salt: data.salt, iv: data.iv, data: data.data }
}

export async function archivePasswordKey(password: string, salt: Uint8Array) {
  if (!crypto.subtle) throw new Error('当前浏览器不支持安全保存，请使用新版浏览器及HTTPS页面。')
  if (password.length < 12 || password.length > 128) throw new Error('请使用12至128个字符的独立口令。')
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new Uint8Array(salt), iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function encryptTrips(trips: SavedTrip[], key: CryptoKey, salt: string): Promise<EncryptedArchive> {
  const clean = validateTrips(trips)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(`${format}:1:${iterations}`) }, key, encoder.encode(JSON.stringify(clean)))
  return parseArchive(JSON.stringify({ format, version: 1, iterations, salt, iv: base64(iv), data: base64(new Uint8Array(cipher)) }))
}

export async function createArchive(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await archivePasswordKey(password, salt)
  return { key, salt: base64(salt) }
}

export async function unlockArchive(value: string, password: string) {
  const envelope = parseArchive(value)
  const key = await archivePasswordKey(password, bytes(envelope.salt))
  let plain: ArrayBuffer
  try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(envelope.iv), additionalData: encoder.encode(`${format}:1:${iterations}`) }, key, bytes(envelope.data)) } catch { throw new Error('口令不正确，或备份文件已损坏。') }
  return { key, salt: envelope.salt, trips: validateTrips(JSON.parse(new TextDecoder().decode(plain))) }
}

export function reviewTripEntries(entries: readonly TripEntry[], places: Place[], directories: Record<string, ShopDirectory>, today = shopCalendarDate()) {
  const available = new Set(resolveTripStops(entries, places, directories, today).map(tripEntryKey))
  return entries.flatMap((entry, index) => {
    if (available.has(tripEntryKey(entry))) return []
    const place = places.find(p => p.published && p.id === entry.placeId)
    const shop = entry.shopName ? directories[entry.placeId]?.shops.find(s => s.name === entry.shopName) : undefined
    const reason = !place ? '地点已移除或暂不公开' : shop && limitedPhase(shop, today) === 'ended' ? '本期快闪已结束' : shop && shopDisplayStatus(shop, today) !== 'open' ? shopStatusLabel(shop, today) : '店铺已移除或更名'
    return [{ entry, index, name: entry.shopName || place?.name || entry.placeId, reason }]
  })
}
