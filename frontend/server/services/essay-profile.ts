import {createHash} from 'node:crypto'
import type {EssayQuestionConfig,EssayScoringProfile} from '../../shared/types/essay.ts'
import {getEssayRuleProfile} from '../data/essay-rule-profiles.ts'
import {fail} from '../core/errors.ts'
import {ESSAY_SCORING_ENGINE_VERSION} from './essay-scoring.ts'

function canonical(value:unknown):unknown {
 if(Array.isArray(value))return value.map(canonical)
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]))
 return value
}

/** A saved question pins both the catalog content and the scoring algorithm. */
export function essayProfileDigest(profile:EssayScoringProfile):string {
 return createHash('sha256').update(JSON.stringify(canonical({engine_version:ESSAY_SCORING_ENGINE_VERSION,profile}))).digest('hex')
}

/** No old result is shown after a catalog/engine change until Writer resaves it. */
export function requireCurrentEssayProfile(config:EssayQuestionConfig|Record<string,never>|undefined):EssayScoringProfile {
 const profile=config&&'profile_id' in config?getEssayRuleProfile(config.profile_id,config.profile_version):undefined
 if(!profile||!config||config.profile_digest!==essayProfileDigest(profile))return fail(409,'content_conflict','論述の採点基準が更新されています。管理者が問題を再保存してから取り組んでください')
 return profile
}

/** PostgreSQL text/JSON and browser text must preserve exactly the same input. */
export function hasUnsupportedEssayCharacters(value:string):boolean {
 return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uD800-\uDFFF]/u.test(value)
}
