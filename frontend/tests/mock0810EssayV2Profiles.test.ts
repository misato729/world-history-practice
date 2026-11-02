import test from 'node:test'
import assert from 'node:assert/strict'
import { MOCK_08_10_ESSAY_PROFILE_REVISIONS } from '../server/data/mock-08-10-essay-profile-revisions.ts'
import { getEssayRuleProfile } from '../server/data/essay-rule-profiles.ts'
import { gradeEssay, validateEssayProfile } from '../server/services/essay-scoring.ts'
import { mock0810EssayV2Cases } from './fixtures/mock0810EssayV2Cases.ts'

for(const fixture of mock0810EssayV2Cases){
 const p=MOCK_08_10_ESSAY_PROFILE_REVISIONS.find(p=>p.id===fixture.id)!
 test(`${p.id} v2: catalog, model and 8-point sum`,()=>{
  validateEssayProfile(p);assert.equal(getEssayRuleProfile(p.id,2),p)
  assert.equal(p.elements.reduce((s,e)=>s+e.points,0),8)
  const result=gradeEssay(p,fixture.model);assert.equal(result.score,8);assert.equal(result.grading_status,'complete')
 })
 test(`${p.id} v2: finite alternatives recognize every element`,()=>{
  for(let i=0;i<fixture.phrases.length;i++)for(const phrase of fixture.phrases[i]!){
   assert.equal(gradeEssay(p,phrase).elements[i]!.status,'matched')
  }
 })
 test(`${p.id} v2: negation, hypothetical, retraction and attribution stay pending`,()=>{
  for(let i=0;i<fixture.phrases.length;i++)for(const phrase of fixture.phrases[i]!){
   for(const suffix of ['ない','ず','なく','未実施','という説は誤り','という文は正しくない']){
    assert.notEqual(gradeEssay(p,phrase+suffix).elements[i]!.status,'matched')
   }
   for(const prefix of ['仮に','もし','誤答として'])assert.notEqual(gradeEssay(p,prefix+phrase).elements[i]!.status,'matched')
  }
 })
 test(`${p.id} v2: known wrong relations and correct/wrong juxtaposition`,()=>{
  for(let i=0;i<p.elements.length;i++){
   const wrong=p.elements[i]!.negative![0]!.sequence[0]![0]!
   assert.notEqual(gradeEssay(p,wrong).elements[i]!.status,'matched')
   assert.notEqual(gradeEssay(p,fixture.phrases[i]![1]+'。'+wrong).elements[i]!.status,'matched')
  }
 })
 test(`${p.id} v2: unknown, empty, overlength do not become full marks`,()=>{
  for(const text of ['この時代については別の説明がある。','', 'あ'.repeat(81)]){
   const r=gradeEssay(p,text);assert.equal(r.confirmed_points,0);assert.notEqual(r.score,8)
  }
  const terms=p.elements.map(e=>e.label.split('：')[0]).join('・')
  assert.notEqual(gradeEssay(p,terms).score,8)
 })
}

test('wrong named actors do not borrow another subject across clauses',()=>{
 const cases=[
 ['mock-08-g03-q02','法顕は往復とも陸路、義浄は往復とも海路でインドを訪れた。'],
 ['mock-09-g02-q03','宋の長安は黄河と大運河の接点にあり、古い街を中心に市場や繁華街が広がって発達した。'],
 ['mock-10-g01-q03','遼は宋へ銀・絹を送った。西夏は宋に銀と絹と茶を与えた。'],
 ['mock-10-g03-q02','カエサルは212年、帝国内の全自由人に市民権を与えた。'],
 ]
 for(const [id,text]of cases)assert.equal(gradeEssay(getEssayRuleProfile(id!)!,text!).confirmed_points,0)
})

test('requested stem counterexamples and unscoped attribution are held',()=>{
 const cases=[
 ['mock-08-g01-q07','穀物徴発を廃止していない'],
 ['mock-08-g01-q07','小農の自由経営と小規模私企業を認めず'],
 ['mock-08-g01-q07','小農の自由経営と小規模私企業を認めたのはスターリンだった'],
 ['mock-09-g04-q05','イエズス会は厳格な規律のもと活動せず'],
 ['mock-09-g04-q05','仮にイエズス会は厳格な規律のもと活動したとする'],
 ['mock-08-g03-q02','玄奘は往復とも陸路ではなかった'],
 ['mock-10-g03-q02','カラカラ帝は212年、帝国内の全自由人に市民権を与えたという説は誤り'],
 ]
 for(const [id,answer]of cases)assert.equal(gradeEssay(getEssayRuleProfile(id!)!,answer!).confirmed_points,0)
})

test('a single sentence may satisfy several elements; compound relations need their objects',()=>{
 for(const fixture of mock0810EssayV2Cases){
  assert.equal(gradeEssay(getEssayRuleProfile(fixture.id)!,fixture.model.replaceAll('。','、')).score,8)
 }
 for(const [id,answer]of [
 ['mock-09-g02-q03','開封は黄河の接点にあった。'],
 ['mock-09-g02-q03','開封。黄河。大運河。接点。'],
 ['mock-10-g03-q02','万民法は非市民にも適用された。'],
 ['mock-10-g01-q03','宋。遼。銀。絹。西夏。茶。'],
 ['mock-09-g04-q05','イエズス会は布教に重点を置いた。'],
 ])assert.equal(gradeEssay(getEssayRuleProfile(id!)!,answer!).confirmed_points,0)
})

const independentCounterexamples=[
 ['mock-09-g04-q05','フランシスコ会は欧州の海外進出と結び付き、アジアや中南米でもカトリックを広めた。'],
 ['mock-08-g01-q07','ムッソリーニは市場経済を部分的に導入して生産力の回復を図った。'],
 ['mock-08-g03-q02','玄奘は往復とも陸路を避けた。'],
 ['mock-08-g03-q02','義浄は往復とも海路を使う計画を撤回した。'],
 ['mock-09-g04-q05','イエズス会は厳格な規律のもとに活動する方針を撤回した。'],
]
for(const [id,answer]of independentCounterexamples)test(`${id} v2: independently found wrong attribution or abandoned action`,()=>{
 const result=gradeEssay(getEssayRuleProfile(id!,2)!,answer!)
 assert.equal(result.confirmed_points,0)
 assert.ok(result.elements.every(e=>e.status==='pending'))
})

test('published v1 remains independently addressable',()=>{
 for(const f of mock0810EssayV2Cases){
  assert.equal(getEssayRuleProfile(f.id,1)!.version,1)
  assert.equal(getEssayRuleProfile(f.id,2)!.version,2)
  assert.ok(getEssayRuleProfile(f.id)!.version>=2)
 }
})
