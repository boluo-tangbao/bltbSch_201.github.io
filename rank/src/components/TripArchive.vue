<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Place, ShopDirectory } from '../types'
import { archiveKey, createArchive, encryptTrips, maxArchiveBytes, parseArchive, reviewTripEntries, sessionTripPreferences, unlockArchive, type SavedTrip } from '../utils/tripArchive'
import { resolveTripStops, tripEntryKey, type TripEntry } from '../utils/tripPlan'
import { useShopToday } from '../utils/shopToday'

const props = defineProps<{ entries: readonly TripEntry[]; places: Place[]; directories: Record<string, ShopDirectory> }>()
const emit = defineEmits<{ close: []; restore: [trip: SavedTrip] }>()
const dialog = ref<HTMLDialogElement>(), trips = ref<SavedTrip[]>([]), opened = ref(false), exists = ref(false), busy = ref(false)
const password = ref(''), confirmation = ref(''), name = ref('我的逛店行程'), message = ref(''), error = ref('')
const deleting = ref(''), renaming = ref(''), renameText = ref(''), erase = ref(false)
const importText = ref(''), importPassword = ref(''), imported = ref<SavedTrip[]>([]), restoring = ref<SavedTrip>()
const today = useShopToday()
const review = computed(() => restoring.value ? reviewTripEntries(restoring.value.entries, props.places, props.directories, today.value) : [])
let key: CryptoKey | undefined, salt = '', original = '', revision = 0, idle: ReturnType<typeof setTimeout> | undefined
let backupUrl = ''
function clearBackup() { if (backupUrl) URL.revokeObjectURL(backupUrl); backupUrl = '' }
function lock() {
  revision++; clearTimeout(idle); clearBackup(); key = undefined; salt = ''; trips.value = []; opened.value = false
  password.value = ''; confirmation.value = ''; importPassword.value = ''; importText.value = ''; imported.value = []; restoring.value = undefined
  renaming.value = ''; renameText.value = ''; deleting.value = ''; erase.value = false; name.value = '我的逛店行程'; message.value = ''; error.value = ''; busy.value = false
  try { exists.value = !!localStorage.getItem(archiveKey) } catch { error.value = '浏览器不允许本机存储，暂不能保存行程。' }
}
function touch() { clearTimeout(idle); if (opened.value) idle = setTimeout(() => { lock(); message.value = '闲置5分钟，已锁定保存的行程。' }, 5 * 60000) }
function hidden() { if (document.hidden) lock() }
onMounted(() => { lock(); dialog.value?.showModal(); document.addEventListener('visibilitychange', hidden) })
onBeforeUnmount(() => { lock(); document.removeEventListener('visibilitychange', hidden) })
async function run(action: (token: number) => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''; message.value = ''; const token = revision
  try { await action(token) } catch (e) { if (token === revision) error.value = e instanceof Error ? e.message : '操作未完成，请重试。' }
  finally { if (token === revision) { busy.value = false; touch() } }
}
function unlock() { void run(async token => {
  const raw = localStorage.getItem(archiveKey) || ''
  let result
  try {
    if (!raw && password.value !== confirmation.value) throw new Error('两次输入的口令不一致。')
    result = raw ? await unlockArchive(raw, password.value) : { ...await createArchive(password.value), trips: [] }
  } finally { password.value = ''; confirmation.value = '' }
  if (token !== revision) return
  original = raw; key = result.key; salt = result.salt; trips.value = result.trips; opened.value = true
}) }
async function persist(next: SavedTrip[], token: number) {
  if (!key) throw new Error('请先解锁。')
  const encrypted = JSON.stringify(await encryptTrips(next, key, salt))
  if (token !== revision) return false
  if ((localStorage.getItem(archiveKey) || '') !== original) throw new Error('另一标签页已修改保存内容，请锁定后重新解锁，避免覆盖。')
  try { localStorage.setItem(archiveKey, encrypted) } catch { throw new Error('保存失败：浏览器不允许存储或空间不足。当前清单仍保留，请检查浏览器设置。') }
  original = encrypted; trips.value = next; exists.value = true
  return true
}
function saveCurrent() { void run(async token => {
  if (!props.entries.length || !name.value.trim()) throw new Error('请先选店并填写行程名称。')
  if (trips.value.length >= 20) throw new Error('最多保存20个行程，请先备份或删除不需要的行程。')
  const stops = resolveTripStops(props.entries, props.places, props.directories, today.value)
  const labels = new Map(stops.map(s => [tripEntryKey(s), s.name]))
  const trip: SavedTrip = { id: crypto.randomUUID(), name: name.value.trim(), savedAt: new Date().toISOString(), entries: JSON.parse(JSON.stringify(props.entries)), labels: props.entries.map(e => labels.get(tripEntryKey(e)) || e.shopName || e.placeId), preferences: sessionTripPreferences() }
  if (await persist([...trips.value, trip], token)) message.value = '行程已加密保存在本机。'
}) }
function rename(trip: SavedTrip) { void run(async token => {
  if (!renameText.value.trim()) throw new Error('行程名称不能为空。')
  if (await persist(trips.value.map(t => t.id === trip.id ? { ...t, name: renameText.value.trim() } : t), token)) renaming.value = ''
}) }
function remove(trip: SavedTrip) {
  if (deleting.value !== trip.id) { deleting.value = trip.id; return }
  void run(async token => { if (await persist(trips.value.filter(t => t.id !== trip.id), token)) deleting.value = '' })
}
function eraseAll() {
  if (!erase.value) { erase.value = true; return }
  try { localStorage.removeItem(archiveKey); lock(); erase.value = false; message.value = '本机保存已删除；下载过的备份文件需自行删除。' } catch { error.value = '浏览器未允许删除，请在浏览器设置中清理本站数据。' }
}
function backup() {
  if (!original) return
  clearBackup(); backupUrl = URL.createObjectURL(new Blob([original], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = backupUrl; link.download = '逛店行程-加密备份.json'; link.click()
}
async function pickFile(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0], token = revision
  input.value = ''; error.value = ''; imported.value = []; importText.value = ''; importPassword.value = ''
  if (!file) return
  try {
    if (file.size > maxArchiveBytes) throw new Error('备份文件不能超过2MB。')
    const value = await file.text(); parseArchive(value)
    if (token === revision) importText.value = value
  } catch (e) { if (token === revision) error.value = e instanceof Error ? e.message : '文件无法读取。' }
}
function readImport() { void run(async token => {
  let result
  try { result = await unlockArchive(importText.value, importPassword.value) } finally { importPassword.value = '' }
  if (token === revision) { imported.value = result.trips; importText.value = '' }
}) }
function mergeImport() { void run(async token => {
  if (trips.value.length + imported.value.length > 20) throw new Error('合并后超过20个行程，请先整理本机保存。')
  const next = imported.value.map(t => ({ ...t, id: crypto.randomUUID() }))
  if (await persist([...trips.value, ...next], token)) { imported.value = []; message.value = '备份已添加，原有行程保留。' }
}) }
function restore() { if (restoring.value) emit('restore', JSON.parse(JSON.stringify(restoring.value))) }
</script>

<template>
  <dialog ref="dialog" class="trip-archive" aria-labelledby="archive-title" @close="emit('close')" @pointerdown="touch" @keydown="touch">
    <header><h2 id="archive-title">本机保存的行程</h2><button type="button" aria-label="关闭本机行程" @click="dialog?.close()">×</button></header>
    <p class="archive-note">名称、地点与自填信息一起加密，仅保存在当前浏览器。口令不保存，忘记后无法找回；清理浏览器数据前请下载加密备份。</p>
    <form v-if="!opened" @submit.prevent="unlock">
      <label>{{ exists ? '解锁口令' : '设置独立口令（12—128个字符）' }}<input v-model="password" type="password" autocomplete="off" minlength="12" maxlength="128" required :disabled="busy"></label>
      <label v-if="!exists">再次输入口令<input v-model="confirmation" type="password" autocomplete="off" minlength="12" maxlength="128" required :disabled="busy"></label>
      <button class="primary" :disabled="busy">{{ busy ? '正在处理…' : exists ? '解锁行程' : '开始使用加密保存' }}</button>
    </form>
    <template v-else>
      <div class="archive-actions"><button type="button" @click="lock">锁定</button><button type="button" :disabled="busy || !original" @click="backup">下载加密备份</button></div>
      <form v-if="entries.length" class="archive-save" @submit.prevent="saveCurrent"><label>本次行程名称<input v-model="name" maxlength="60" required :disabled="busy"></label><button class="primary" :disabled="busy">保存本次行程</button></form>
      <p v-else class="archive-note">先从榜单选店，再来保存；也可导入以前的加密备份。</p>
      <ul class="archive-list">
        <li v-for="trip in trips" :key="trip.id"><strong>{{ trip.name }}</strong><small>{{ trip.entries.length }}项 · 保存于 {{ new Date(trip.savedAt).toLocaleDateString('zh-CN') }}</small><div class="archive-actions"><button type="button" :disabled="busy" @click="restoring = trip">查看并恢复</button><button type="button" :disabled="busy" @click="renaming = trip.id; renameText = trip.name">重命名</button><button type="button" :disabled="busy" @click="remove(trip)">{{ deleting === trip.id ? '确认删除此行程' : '删除' }}</button></div><button v-if="deleting === trip.id" type="button" @click="deleting = ''">取消删除</button><form v-if="renaming === trip.id" @submit.prevent="rename(trip)"><label>新的行程名称<input v-model="renameText" maxlength="60" required></label><button :disabled="busy">保存名称</button><button type="button" @click="renaming = ''">取消</button></form></li>
      </ul>
      <section v-if="restoring" class="archive-review" aria-label="恢复前检查"><h3>{{ restoring.name }}</h3><p class="archive-note">将替换本次清单，已保存的原计划保留。出发时间、完成进度和通勤估算重新开始；下列提醒按当前店单核对。</p><ol><li v-for="(label, index) in restoring.labels" :key="index">{{ label }}<span v-if="review.find(r => r.index === index)" class="archive-warning"> · {{ review.find(r => r.index === index)?.reason }}</span></li></ol><button type="button" class="primary" :disabled="busy" @click="restore">恢复到本次清单</button><button type="button" @click="restoring = undefined">取消恢复</button></section>
      <section class="archive-import"><h3>从备份添加行程</h3><label>选择加密备份文件<input type="file" accept=".json,application/json" :disabled="busy" @change="pickFile"></label><form v-if="importText" @submit.prevent="readImport"><label>备份文件的口令<input v-model="importPassword" type="password" autocomplete="off" minlength="12" maxlength="128" required></label><button :disabled="busy">读取备份预览</button></form><template v-if="imported.length"><p>将添加{{ imported.length }}个行程，保留已有行程：</p><ul><li v-for="trip in imported" :key="trip.id">{{ trip.name }} · {{ trip.entries.length }}项</li></ul><button type="button" :disabled="busy" @click="mergeImport">添加这些行程</button><button type="button" @click="imported = []">取消导入</button></template></section>
    </template>
    <p v-if="error" class="archive-warning" role="alert">{{ error }}</p><p v-if="message" role="status">{{ message }}</p>
    <footer><p class="archive-note">关闭窗口、切到后台或闲置5分钟会锁定保存区；恢复后的本次清单仍可查看。共用设备用完请清空本次清单。明文HTML清单包含地址和备注，请谨慎转发。</p><button v-if="exists" type="button" :disabled="busy" @click="eraseAll">{{ erase ? '确认删除全部本机行程' : '删除全部本机行程' }}</button><button v-if="erase" type="button" @click="erase = false">取消删除</button></footer>
  </dialog>
</template>

<style scoped>
.trip-archive { width: min(680px, calc(100% - 24px)); max-height: calc(100dvh - 32px); margin: auto; padding: 20px; overflow: auto; border: 2px solid var(--ui-ink); border-radius: var(--ui-radius-dialog); background: var(--ui-paper); color: var(--ui-ink); }
.trip-archive::backdrop { background: #29283088; }
header, .archive-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
header { justify-content: space-between; } h2 { font-size: 22px; } h3 { font-size: 16px; }
button { min-height: 44px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-control); padding: 8px 12px; background: var(--ui-surface); color: var(--ui-accent); font: inherit; font-size: 13px; }
button.primary { background: var(--ui-accent); color: var(--ui-surface); }
label { display: grid; gap: 6px; margin: 12px 0; font-size: 13px; }
input { min-height: 44px; width: 100%; min-width: 0; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-control); padding: 8px; background: var(--ui-surface); color: var(--ui-ink); font: inherit; font-size: 16px; }
.archive-note, small { display: block; margin: 12px 0; font-size: 12px; line-height: 1.8; color: var(--ui-muted); }
.archive-list { list-style: none; padding: 0; } .archive-list > li, .archive-review, .archive-import, footer, .archive-save { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--ui-border); }
li, p { overflow-wrap: anywhere; line-height: 1.8; } .archive-warning { color: var(--ui-accent); font-size: 13px; }
@media (max-width: 580px) { .trip-archive { padding: 14px; } }
</style>
