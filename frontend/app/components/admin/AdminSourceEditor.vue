<script setup lang="ts">
import type { SourceReference } from '../../../shared/types/learning'

const sources = defineModel<SourceReference[]>({ required: true })
const editorId = useId()
const add = (kind: 'book' | 'web') => { sources.value = [...sources.value, { kind, title: '' }] }
const remove = (index: number) => { sources.value = sources.value.filter((_, sourceIndex) => index !== sourceIndex) }
</script>

<template>
  <div class="source-editor">
    <article v-for="(source, index) in sources" :key="index" class="source-entry">
      <header><strong>出典 {{ index + 1 }}</strong><button type="button" class="admin-icon-button" :aria-label="`出典${index + 1}を削除`" @click="remove(index)"><UIcon name="i-lucide-trash-2" /></button></header>
      <div class="source-fields">
        <div class="admin-field"><label :for="`${editorId}-kind-${index}`">資料の種類</label><select :id="`${editorId}-kind-${index}`" v-model="source.kind"><option value="book">書籍</option><option value="web">Web資料</option></select></div>
        <div class="admin-field"><label :for="`${editorId}-title-${index}`">{{ source.kind === 'book' ? '書名' : '資料名' }}</label><input :id="`${editorId}-title-${index}`" v-model="source.title" type="text"></div>
        <template v-if="source.kind === 'book'">
          <div class="admin-field"><label :for="`${editorId}-publisher-${index}`">出版社</label><input :id="`${editorId}-publisher-${index}`" v-model="source.publisher" type="text"></div>
          <div class="admin-field"><label :for="`${editorId}-edition-${index}`">版・課程</label><input :id="`${editorId}-edition-${index}`" v-model="source.edition" type="text"></div>
          <div class="admin-field"><label :for="`${editorId}-year-${index}`">刊行年</label><input :id="`${editorId}-year-${index}`" v-model="source.publication_year" type="text" inputmode="numeric"></div>
          <div class="admin-field"><label :for="`${editorId}-section-${index}`">章節・項目</label><input :id="`${editorId}-section-${index}`" v-model="source.section" type="text"></div>
          <div class="admin-field source-wide"><label :for="`${editorId}-locator-${index}`">確認した掲載位置</label><input :id="`${editorId}-locator-${index}`" v-model="source.locator" type="text" placeholder="印刷ページ・電子書籍の位置・項目名など"><small>印刷ページと電子書籍の位置を区別し、確認できた情報だけを記載します。</small></div>
        </template>
        <div class="admin-field source-wide"><label :for="`${editorId}-url-${index}`">URL{{ source.kind === 'book' ? '（任意・書誌案内等）' : '' }}</label><input :id="`${editorId}-url-${index}`" v-model="source.url" type="url" placeholder="https://..."></div>
        <div v-if="source.kind === 'web'" class="admin-field"><label :for="`${editorId}-checked-${index}`">確認日</label><input :id="`${editorId}-checked-${index}`" v-model="source.checked_at" type="date"></div>
      </div>
    </article>
    <div class="source-actions"><button class="admin-secondary-button" type="button" @click="add('book')"><UIcon name="i-lucide-book-open" />書籍を追加</button><button class="admin-secondary-button" type="button" @click="add('web')"><UIcon name="i-lucide-link" />Web資料を追加</button></div>
    <p class="source-note">原資料の画像・全文や端末内の保存場所は入力しません。出典は回答後に表示します。</p>
  </div>
</template>

<style scoped>
.source-editor { display: grid; gap: 14px; }
.source-entry { min-width: 0; padding: 15px; border: 1px solid var(--admin-line); border-radius: 6px; background: var(--admin-chrome); }
.source-entry header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.source-entry header strong { font-size: .8125rem; }
.source-entry .admin-icon-button { width: 34px; min-height: 34px; padding: 0; }
.source-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.source-fields .admin-field { min-width: 0; }
.source-wide { grid-column: 1 / -1; }
.source-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.source-note { margin: 0; color: var(--admin-muted); font-size: .75rem; line-height: 1.7; }
@media (max-width: 640px) { .source-fields { grid-template-columns: 1fr; } .source-wide { grid-column: auto; } }
</style>
