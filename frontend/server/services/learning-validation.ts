import type { ExamConfiguration, CulturalHistoryCategoryCode } from '../../shared/examConfig.ts'
import type { AnswerType, LearningBlock, InputConstraints, SourceReference, TopicLink, PassageReference, PassageInline } from '../../shared/types/learning.ts'
import { configuration } from '../core/config.ts'
import { fail } from '../core/errors.ts'
import type { EssayQuestionConfig } from '../../shared/types/essay.ts'
import { gradeEssay } from './essay-scoring.ts'
import { getEssayRuleProfile } from '../data/essay-rule-profiles.ts'
import { essayProfileDigest, hasUnsupportedEssayCharacters } from './essay-profile.ts'
export type Block = LearningBlock
export type ChoiceInput = { id?: number; choice_label: string; content_blocks: Block[]; is_correct: boolean; display_order: number }
export type QuestionInput = {
  exam_number: number; question_number: number; major_category_code: string; category_code: string
  is_cultural_history: boolean; is_art_history: boolean; cultural_history_category: CulturalHistoryCategoryCode | null
  publication_status: string; content_blocks: Block[]; explanation_blocks: Block[]; source_text: string | null; choices: ChoiceInput[]
  group_id?: number | null; group_question_number?: number | null; answer_type?: AnswerType
  accepted_answers?: string[]; input_constraints?: InputConstraints; essay_config?: EssayQuestionConfig | Record<string, never>; related_topics?: TopicLink[]
  source_references?: SourceReference[]; passage_references?: PassageReference[]; lock_version?: number
}
export type NormalizedQuestionInput = QuestionInput & {
  group_id: number | null; group_question_number: number | null; answer_type: AnswerType
  accepted_answers: string[]; input_constraints: InputConstraints; essay_config: EssayQuestionConfig | Record<string, never>; related_topics: TopicLink[]
  source_references: SourceReference[]; passage_references: PassageReference[]
}
export type BlockContext = 'question' | 'explanation' | 'choice'
const allowedTypes: Record<BlockContext, readonly string[]> = {
  question: ['text','quote','table','code','code_group','fill_in_text','fill_in_quote'],
  explanation: ['text','quote','table','code'], choice: ['text','table','fill_in_choice'],
}
export const record = (value: unknown): value is Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value)
export const nonblank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string')
export const invalid = (message: string, details: Record<string,string[]> = {}): never => fail(422,'validation_error',message,details)
export function integer(value: unknown): number | undefined {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[+-]?\d+$/.test(value.trim()))) return undefined
  const number = Number(value); return Number.isSafeInteger(number) ? number : undefined
}
const key = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_:-]{1,100}$/.test(value)
function parseInlines(value: unknown): PassageInline[] {
  if (!Array.isArray(value)) return invalid('本文のインライン要素を確認してください')
  return value.map<PassageInline>(item => {
    if (!record(item)) return invalid('本文のインライン要素を確認してください')
    if (item.type === 'text' && typeof item.text === 'string') return { type:'text',text:item.text }
    if (item.type === 'anchor' && key(item.id) && nonblank(item.label) && typeof item.text === 'string' && (item.underline === undefined || typeof item.underline === 'boolean')) return { type:'anchor',id:item.id,label:item.label,text:item.text,underline:item.underline ?? true }
    if (item.type === 'blank' && key(item.id) && nonblank(item.label)) return { type:'blank',id:item.id,label:item.label }
    return invalid('本文の参照ID・ラベルを確認してください')
  })
}
function parseBlock(value: unknown, context: BlockContext, preserveOptionalAttributes: boolean): Block {
  if (!record(value) || typeof value.type !== 'string' || !allowedTypes[context].includes(value.type)) return invalid('表示ブロックの種類が正しくありません',{content_blocks:['使用できない表示ブロックです']})
  const block: Block = { type:value.type }
  if (value.id !== undefined) { if (!key(value.id)) return invalid('表示ブロックのIDを確認してください'); block.id=value.id }
  switch(block.type) {
    case 'text': case 'quote': case 'fill_in_text': case 'fill_in_quote':
      if (value.inlines !== undefined) {
        block.inlines=parseInlines(value.inlines)
        if (nonblank(value.text) && block.inlines.length) return invalid('通常文とインライン要素はどちらか一方で入力してください')
      } else if (typeof value.text !== 'string') return invalid('表示ブロックの内容の形式が不正です')
      if (typeof value.text === 'string') block.text=value.text
      if (value.source !== undefined && value.source !== null && typeof value.source !== 'string') return invalid('表示ブロックの出典を確認してください')
      if (block.type==='quote' && (preserveOptionalAttributes ? value.source!==undefined : nonblank(value.source))) block.source=value.source
      break
    case 'code':
      if (typeof value.code!=='string' || (value.title!==undefined && value.title!==null && typeof value.title!=='string')) return invalid('表示ブロックの内容の形式が不正です')
      block.code=value.code
      if (preserveOptionalAttributes ? value.title!==undefined : nonblank(value.title)) block.title=value.title
      break
    case 'table':
      if (!strings(value.headers)||!Array.isArray(value.rows)||!value.rows.every((row: unknown)=>strings(row)&&row.length===value.headers.length)) return invalid('表の列数を確認してください',{content_blocks:['見出しと各行の列数を揃えてください']})
      block.headers=[...value.headers];block.rows=value.rows.map((row:string[])=>[...row]);break
    case 'fill_in_choice': if (!strings(value.cells)) return invalid('選択肢のセルを確認してください');block.cells=[...value.cells];break
    case 'code_group':
      if (!Array.isArray(value.items)||!value.items.every((item:unknown)=>record(item)&&typeof item.code==='string'&&(item.title===undefined||item.title===null||typeof item.title==='string'))) return invalid('プログラム比較の内容を確認してください')
      block.items=value.items.map((item:any)=>({...((preserveOptionalAttributes?item.title!==undefined:nonblank(item.title))?{title:item.title}:{}),code:item.code}));break
  }
  return block
}
export function blockText(block: Block): string { return block.inlines ? block.inlines.map(item=>item.type==='blank'?item.label:item.text).join('') : block.text??'' }
export function validateBlocks(value: unknown, context: BlockContext, published=false, preserveOptionalAttributes=true): Block[] {
  if (!Array.isArray(value)) return invalid('表示ブロックは配列で指定してください')
  const blocks=value.map(block=>parseBlock(block,context,preserveOptionalAttributes))
  const ids=blocks.flatMap(block=>[...(block.id?[block.id]:[]),...(block.inlines??[]).filter(item=>item.type!=='text').map(item=>('id' in item?item.id:''))])
  if (new Set(ids).size!==ids.length) return invalid('本文内の参照IDが重複しています')
  if (!published) return blocks
  if (context === 'question' && blocks.some(block => block.inlines?.some(item => item.type === 'anchor' && (!nonblank(item.text) || item.underline === false)))) {
    return invalid('公開する本文の下線には対象の語句・文を指定し、下線を有効にしてください')
  }
  const complete=blocks.length>0&&blocks.every(block=>{
    switch(block.type) {
      case 'text':case 'quote':case 'fill_in_text':case 'fill_in_quote': return nonblank(blockText(block))
      case 'code':return nonblank(block.code)
      case 'fill_in_choice':return Boolean(block.cells?.length&&block.cells.every(nonblank))
      case 'code_group':return Boolean(block.items&&block.items.length>=2&&block.items.every(item=>nonblank(item.code)))
      case 'table':return Boolean(block.headers?.length&&block.rows?.length&&block.headers.some(nonblank)&&block.rows.flat().some(nonblank))
      default:return false
    }
  })
  if (!complete) return invalid('公開する問題の本文・解説・選択肢に空または不正な表示ブロックがあります')
  return blocks
}
export function validSource(line:string):boolean {
  const match=/^.+\s\|\s(https:\/\/\S+)$/.exec(line)
  if(!match?.[1])return false
  return validHttps(match[1])
}
function validHttps(value:string):boolean {try {const u=new URL(value);return u.protocol==='https:'&&Boolean(u.hostname)&&!u.username&&!u.password}catch{return false}}
export function validateSources(value:unknown,published=false):SourceReference[] {
  if(value===undefined)return []
  if(!Array.isArray(value)||value.length>100)return invalid('出典一覧を確認してください')
  return value.map(raw=>{
    if(!record(raw)||!['book','web'].includes(raw.kind)||typeof raw.title!=='string'||(published&&!nonblank(raw.title)))return invalid('出典の種類と資料名を入力してください')
    const out:SourceReference={kind:raw.kind,title:raw.title.trim()}
    for(const field of ['publisher','edition','publication_year','section','locator','url','checked_at'] as const){
      if(raw[field]!==undefined&&raw[field]!==null&&raw[field]!==''){
        if(typeof raw[field]!=='string'||raw[field].length>2000)return invalid('出典の書誌情報を確認してください')
        out[field]=raw[field].trim()
      }
    }
    if((published&&out.kind==='web'&&!out.url)||(out.url&&!validHttps(out.url)))return invalid('Web資料には認証情報を含まないHTTPS URLが必要です')
    if(out.checked_at&&!/^\d{4}-\d{2}-\d{2}$/.test(out.checked_at))return invalid('出典の確認日を確認してください')
    return out
  })
}
export function validateInputConstraints(value:unknown):InputConstraints {
  if(value===undefined)return {}
  if(!record(value))return invalid('記述の入力条件を確認してください')
  const out:InputConstraints={}
  if(value.script!==undefined){if(!['any','kanji','katakana'].includes(value.script))return invalid('文字種を確認してください');out.script=value.script}
  for(const field of ['exact_length','max_length'] as const)if(value[field]!==undefined&&value[field]!==null&&value[field]!==''){
    const n=integer(value[field]);if(!n||n>1000)return invalid('入力文字数を確認してください');out[field]=n
  }
  if(out.exact_length&&out.max_length&&out.exact_length>out.max_length)return invalid('入力文字数の条件が矛盾しています')
  if(value.hint!==undefined){if(typeof value.hint!=='string'||value.hint.length>500)return invalid('入力条件の説明を確認してください');out.hint=value.hint}
  return out
}
export function validateTopics(value:unknown,config:ExamConfiguration):TopicLink[]{
  if(value===undefined)return []
  if(!Array.isArray(value)||value.length>config.categories.minor.length)return invalid('関連する章・節を確認してください')
  const result:TopicLink[]=value.map(raw=>{
    if(!record(raw)||!config.categories.minor.some(c=>c.value===raw.category_code&&c.major_category_value===raw.major_category_code))return invalid('関連分類は有効な章・節の組合せを指定してください')
    return {major_category_code:raw.major_category_code,category_code:raw.category_code}
  })
  if(new Set(result.map(v=>v.category_code)).size!==result.length)return invalid('関連分類が重複しています')
  return result
}
export function normalizeAnswerText(value:string):string{return value.normalize('NFKC').trim()}
export function checkTextConstraints(value:string,rules:InputConstraints):boolean {
  const text=normalizeAnswerText(value);const length=Array.from(text).length
  return Boolean(text)&&length<=(rules.max_length??1000)&&(!rules.exact_length||length===rules.exact_length)
    &&(rules.script!=='kanji'||/^[\p{Script=Han}々〇]+$/u.test(text))
    &&(rules.script!=='katakana'||/^[\p{Script=Katakana}ー・＝=\s]+$/u.test(text))
}
export function validateEssayConfig(value:unknown,answerType:AnswerType,published=false):EssayQuestionConfig|Record<string,never> {
  const raw=value??{}
  if(!record(raw))return invalid('論述の採点設定を確認してください')
  if(answerType!=='essay'){
    if(Object.keys(raw).length)return invalid('論述以外に論述の採点設定は登録できません')
    return {}
  }
  if(!Object.keys(raw).length&&!published)return {}
  if(Object.keys(raw).some(k=>!['model_answer','profile_id','profile_version','profile_digest'].includes(k))||!key(raw.profile_id)||!Number.isSafeInteger(raw.profile_version)||raw.profile_version<1||typeof raw.model_answer!=='string'||raw.model_answer.length>4000||hasUnsupportedEssayCharacters(raw.model_answer))return invalid('論述の採点基準・版・模範解答を確認してください')
  const profile=getEssayRuleProfile(raw.profile_id,raw.profile_version)
  if(!profile)return invalid('登録済みの論述採点基準と版を選択してください')
  const out:EssayQuestionConfig={profile_id:raw.profile_id,profile_version:raw.profile_version,model_answer:raw.model_answer,profile_digest:essayProfileDigest(profile)}
  if(published){
    const result=gradeEssay(profile,out.model_answer)
    if(result.grading_status!=='complete'||result.score!==8)return invalid('公開する論述には字数・指定語・全採点要素を満たす模範解答が必要です')
  }
  return out
}
export function validateQuestionInput(value:unknown,config:ExamConfiguration=configuration,preserveOptionalAttributes=true):NormalizedQuestionInput {
  if(!record(value))return invalid('問題の入力内容を確認してください')
  const examNumber=integer(value.exam_number),questionNumber=integer(value.question_number)
  const groupId=value.group_id===undefined||value.group_id===null||value.group_id===''?null:integer(value.group_id)
  const groupNumber=value.group_question_number===undefined||value.group_question_number===null||value.group_question_number===''?null:integer(value.group_question_number)
  if(groupId===undefined||(groupId!==null&&groupId<1)||groupNumber===undefined||(groupNumber!==null&&groupNumber<1)||(groupId===null)!==(groupNumber===null))return invalid('大問と大問内小問番号を確認してください')
  if(examNumber===undefined||examNumber<1||examNumber>config.exam.set_count)return invalid('入力内容を確認してください',{exam_number:[`は1〜${config.exam.set_count}の整数で指定してください`]})
  const limit=groupId===null?config.exam.questions_per_exam:30
  if(questionNumber===undefined||questionNumber<1||questionNumber>limit)return invalid('入力内容を確認してください',{question_number:[`は1〜${limit}の整数で指定してください`]})
  const major=config.categories.major.find(v=>v.value===value.major_category_code),category=config.categories.minor.find(v=>v.value===value.category_code)
  if(!major||!category||category.major_category_value!==major.value)return invalid('入力内容を確認してください',{category_code:['は有効な大分類・小分類の組合せを指定してください']})
  for(const field of ['is_cultural_history','is_art_history'])if(value[field]!==undefined&&typeof value[field]!=='boolean')return invalid('文化史・美術史の指定を確認してください')
  const culture=value.is_cultural_history??false
  if(value.is_art_history&&!culture)return invalid('美術史の問題は文化史にも指定してください')
  const cultureCategory=value.cultural_history_category===undefined?(culture?(value.is_art_history?'art_history':'other_cultural_history'):null):value.cultural_history_category
  if(cultureCategory!==null&&(typeof cultureCategory!=='string'||!config.cultural_history_categories.some(v=>v.value===cultureCategory)))return invalid('文化史の区分を確認してください')
  if(culture!==(cultureCategory!==null))return invalid('文化史と区分の組合せを確認してください')
  const art=cultureCategory==='art_history'
  if(value.is_art_history!==undefined&&value.is_art_history!==art)return invalid('美術史と文化史の区分が一致しません')
  if(!['draft','published','private'].includes(value.publication_status))return invalid('公開状態を確認してください')
  const answerType=value.answer_type??'single_choice'
  if(!['single_choice','short_text','essay'].includes(answerType))return invalid('回答形式を確認してください')
  const published=value.publication_status==='published',flexibleDraft=groupId!==null&&!published
  const essayConfig=validateEssayConfig(value.essay_config,answerType,published)
  const contentBlocks=validateBlocks(value.content_blocks,'question',published,preserveOptionalAttributes),explanationBlocks=validateBlocks(value.explanation_blocks,'explanation',published,preserveOptionalAttributes)
  const sourceText=value.source_text===undefined||value.source_text===null?null:value.source_text
  if(sourceText!==null&&typeof sourceText!=='string')return invalid('出典の形式を確認してください')
  const sourceReferences=validateSources(value.source_references,published),rules=validateInputConstraints(value.input_constraints)
  const accepted=value.accepted_answers??[]
  if(!strings(accepted)||accepted.length>100||accepted.some(v=>!nonblank(v)||v.length>1000))return invalid('語句記述の正答表記を確認してください')
  if(new Set(accepted.map(normalizeAnswerText)).size!==accepted.length)return invalid('語句記述の正答表記が重複しています')
  if(answerType==='short_text'&&published&&(!accepted.length||accepted.some(v=>!checkTextConstraints(v,rules))))return invalid('入力条件を満たす語句記述の正答が必要です')
  const rawChoices=value.choices??[]
  if(!Array.isArray(rawChoices))return invalid('選択肢を配列で指定してください')
  const labels=config.exam.choice_labels
  if(answerType!=='single_choice'&&rawChoices.length)return invalid('記述・論述には選択肢を登録しないでください')
  if(answerType==='essay'&&(accepted.length||rules.exact_length||rules.max_length||(rules.script&&rules.script!=='any')))return invalid('論述では採点基準の字数・指定語を使います。語句記述の正答・入力条件を空にしてください')
  if(answerType==='single_choice'&&(!flexibleDraft?rawChoices.length!==labels.length:rawChoices.length>labels.length))return invalid(`選択肢は${labels.length}件入力してください`,{choices:[`は${labels.length}件必要です`]})
  const choices:ChoiceInput[]=rawChoices.map((raw,index)=>{
    if(!record(raw))return invalid('選択肢の形式を確認してください')
    const order=integer(raw.display_order),id=raw.id===undefined||raw.id===null||raw.id===''?undefined:integer(raw.id)
    if(raw.choice_label!==labels[index]||order!==index+1||typeof raw.is_correct!=='boolean'||(id!==undefined&&id<1)||(raw.id!==undefined&&raw.id!==null&&raw.id!==''&&id===undefined))return invalid('選択肢のラベル・順序・IDを確認してください')
    return {...(id===undefined?{}:{id}),choice_label:raw.choice_label,content_blocks:validateBlocks(raw.content_blocks,'choice',published,preserveOptionalAttributes),is_correct:raw.is_correct,display_order:order}
  })
  if(new Set(choices.filter(c=>c.id!==undefined).map(c=>c.id)).size!==choices.filter(c=>c.id!==undefined).length)return invalid('選択肢IDが重複しています')
  if(answerType==='single_choice'&&(!flexibleDraft?choices.filter(c=>c.is_correct).length!==1:choices.filter(c=>c.is_correct).length>1))return invalid('正答を1件選択してください',{choices:['正答は1件必要です']})
  const refs=value.passage_references??[]
  if(!Array.isArray(refs)||refs.length>100)return invalid('共通本文の参照を確認してください')
  const references:PassageReference[]=refs.map(raw=>{if(!record(raw)||!integer(raw.passage_id)||raw.passage_id<1||(raw.anchor_id!==null&&!key(raw.anchor_id)))return invalid('本文参照のIDを確認してください');return {passage_id:Number(raw.passage_id),anchor_id:raw.anchor_id}})
  if(new Set(references.map(r=>`${r.passage_id}/${r.anchor_id??''}`)).size!==references.length)return invalid('本文参照が重複しています')
  if(groupId===null&&references.length)return invalid('大問未所属の問題から共通本文を参照できません')
  if(value.lock_version!==undefined&&(!integer(value.lock_version)||Number(value.lock_version)<1))return invalid('編集バージョンを確認してください')
  if(published){
    const sources=(sourceText??'').split(/\r?\n/).map((v:string)=>v.trim()).filter(Boolean)
    if(!sourceReferences.length&&(sources.length===0||sources.some((v:string)=>!validSource(v))))return invalid('公開する問題には書籍・Web出典が必要です')
    const blanks=[...new Set(contentBlocks.flatMap(block=>[...blockText(block).matchAll(/\{\{([^}]+)\}\}/g)].map(m=>m[1]!)))].sort()
    const fillChoices=choices.map(c=>c.content_blocks.filter(b=>b.type==='fill_in_choice'))
    if(blanks.length||fillChoices.some(b=>b.length)){const expected=['①','②','③','④','⑤','⑥'].slice(0,blanks.length);if(!blanks.length||JSON.stringify(blanks)!==JSON.stringify(expected)||fillChoices.some(b=>b.length!==1||b[0]?.cells?.length!==blanks.length))return invalid('空欄ラベルと全選択肢のセル数を一致させてください')}
  }
  return {exam_number:examNumber,question_number:questionNumber,major_category_code:major.value,category_code:category.value,is_cultural_history:culture,is_art_history:art,cultural_history_category:cultureCategory,publication_status:value.publication_status,content_blocks:contentBlocks,explanation_blocks:explanationBlocks,source_text:sourceText,choices,group_id:groupId,group_question_number:groupNumber,answer_type:answerType,accepted_answers:[...accepted],input_constraints:rules,essay_config:essayConfig,related_topics:validateTopics(value.related_topics,config),source_references:sourceReferences,passage_references:references,...(value.lock_version!==undefined?{lock_version:Number(value.lock_version)}:{})}
}
export function sanitizeQuestionInput(value:unknown,config:ExamConfiguration=configuration):NormalizedQuestionInput {
  if(!record(value))return fail(400,'bad_request','questionを指定してください')
  const raw=structuredClone(value);const flexible=Boolean(raw.group_id)||['short_text','essay'].includes(raw.answer_type)
  for(const field of ['content_blocks','explanation_blocks'])if(!Array.isArray(raw[field])||(!flexible&&!raw[field].length))return invalid('表示ブロックを1件以上入力してください')
  raw.source_text=nonblank(raw.source_text)?raw.source_text:null
  if(Array.isArray(raw.choices))raw.choices=raw.choices.map((v,index)=>{if(!record(v))return invalid('選択肢を確認してください');const falseValues=new Set([false,0,'0','f','F','false','FALSE','off','OFF','',null,undefined]);return {...v,is_correct:!falseValues.has(v.is_correct),display_order:index+1}})
  const input=validateQuestionInput(raw,config,false)
  for(const blocks of [input.content_blocks,input.explanation_blocks,...input.choices.map(c=>c.content_blocks)])for(const b of blocks){if(b.type==='table'&&(!b.headers?.length||!b.rows?.length))return invalid('表の列数を確認してください');if(b.type==='code_group'&&(!b.items||b.items.length<2))return invalid('比較するプログラムを2件以上入力してください')}
  return input
}
export function excerptFrom(blocks:Block[]):string {
  const block=blocks.find(b=>['text','quote','fill_in_text','fill_in_quote'].includes(b.type));const text=block?blockText(block):''
  const value=nonblank(text)?text.replace(/\{\{([^{}]+)\}\}/g,'$1').replace(/\s+/g,' ').trim():(blocks.find(b=>b.type==='fill_in_choice')?.cells??[]).join(' / ')
  const chars=Array.from(value);return chars.length>120?`${chars.slice(0,117).join('')}...`:value
}
