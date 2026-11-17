/* Run with: node tests.cjs */
function runTests(M,words){
 let count=0;
 function ok(value,message){if(!value)throw Error(message); }
 function test(name,fn){fn();count++;return name;}
 const cfg=(extra={})=>({names:['Azul','Rosa'],seconds:60,target:30,mode:'single',difficulty:'mixed',categories:['Animais'],...extra});
 function running(extra={}){const s=M.create(cfg(extra),words);M.step(s,'reveal',0,()=>0);M.step(s,'begin',1000);return s;}
 test('Reject empty, duplicate, missing and excessive teams',()=>{
 for(const names of [[],['A'],['A',''],['A','a'],['1','2','3','4','5']]){
 let threw=false;try{M.create(cfg({names}),words);}catch(e){threw=true;}ok(threw,'Invalid teams accepted');
 }});
 test('Reject invalid timer, target, categories and levels',()=>{
 for(const extra of [{seconds:0},{seconds:15.2},{seconds:301},{target:-1},{target:NaN},{target:501},{categories:[]},{difficulty:'bad'}]){
 let threw=false;try{M.create(cfg(extra),words);}catch(e){threw=true;}ok(threw,'Invalid settings accepted');
 }});
 test('One correct answer cannot be counted twice',()=>{
 const s=running();M.step(s,'hit',2000);const score=s.teams[0].score;ok(score===1,'Wrong points');ok(!M.step(s,'hit',2001),'Duplicate accepted');ok(s.teams[0].score===score,'Duplicate points');
 });
 test('Timer resets and teams rotate',()=>{
 const s=running({seconds:45});M.step(s,'pass',4000);M.step(s,'next',5000);ok(s.remaining===45000&&s.idx===1&&s.phase==='ready'&&s.word===null,'Next turn invalid');
 M.step(s,'reveal',6000,()=>0);M.step(s,'begin',7000);M.step(s,'pass',8000);M.step(s,'next',9000);ok(s.idx===0&&s.turn===2,'Rotation invalid');
 });
 test('Timer uses elapsed time; pause freezes it; resume sets fresh deadline',()=>{
 const s=running();M.step(s,'pause',11000);ok(s.remaining===50000&&s.phase==='paused','Pause invalid');M.step(s,'tick',200000);ok(s.remaining===50000,'Paused timer moved');
 M.step(s,'resume',300000);M.step(s,'tick',310000);ok(s.remaining===40000,'Resume invalid');
 });
 test('Deadline prevents scoring, including a tap at the deadline',()=>{
 const s=running();M.step(s,'hit',61000);ok(s.phase==='summary'&&s.remaining===0&&s.teams[0].score===0,'Late score accepted');
 ok(s.history.length===1,'Timeout repeated');M.step(s,'tick',90000);ok(s.history.length===1,'Repeated expiry');
 });
 test('Many-word mode preserves deadline and blocks rapid taps',()=>{
 const s=running({mode:'many'}),first=s.word.id;M.step(s,'hit',2000,()=>0);ok(s.phase==='running'&&s.deadline===61000&&s.word.id!==first,'Many mode invalid');
 const score=s.teams[0].score;ok(!M.step(s,'hit',2100),'Rapid tap accepted');ok(s.teams[0].score===score,'Rapid score');
 M.step(s,'pass',3000,()=>0);ok(s.teams[0].score===score&&s.phase==='running','Pass penalty or ended turn');
 });
 test('Every team shares a difficulty per mixed round',()=>{
 const s=M.create(cfg({names:['A','B','C','D']}),words);s.idx=2;
 for(let turn=0;turn<12;turn++){ok(M.turnLevel(s)===1+Math.floor(turn/4),'Unbalanced level');M.step(s,'reveal',turn*100000,()=>0);M.step(s,'begin',turn*100000);M.step(s,'pass',turn*100000+1000);M.step(s,'next',turn*100000+2000);}
 });
 test('Victory, save and restoration preserve scores and hide active words',()=>{
 const s=running({target:1});M.step(s,'hit',2000);ok(s.phase==='finished','No victory');ok(M.restore(JSON.stringify(s)).teams[0].score===1,'Lost victory');
 const active=running();M.step(active,'tick',10000);const restored=M.restore(JSON.stringify(active));ok(restored.phase==='paused'&&restored.remaining===51000,'Unsafe restore');
 const snapshot=M.copy(active);M.step(active,'hit',11000);const reverted=M.restore(snapshot);ok(reverted.teams[0].score===0&&reverted.phase==='paused','Undo invalid');
 });
 test('No word repeats until its level deck is exhausted',()=>{
 const pool=words.filter(w=>w.cat==='Animais'&&w.level===1);const s=running({mode:'many',difficulty:'1',seconds:300,target:500});const seen=new Set([s.word.id]);
 for(let i=1;i<pool.length;i++){M.step(s,'pass',1000+i*600,()=>0);ok(!seen.has(s.word.id),'Word repeated');seen.add(s.word.id);}
 M.step(s,'pass',1000+pool.length*600,()=>0);ok(s.message.includes('reembaralhado'),'No deck reset notice');ok(s.phase==='running','Empty deck crash');
 });
 test('Word bank has unique entries, consistent points and usable category-level combinations',()=>{
 ok(words.length===394,'Unexpected word count');ok(new Set(words.map(w=>w.id)).size===words.length,'Duplicate ids');
 ok(words.every(w=>w.cat&&w.word&&[1,2,3].includes(w.level)),'Invalid word');
 const cats=[...new Set(words.map(w=>w.cat))];ok(cats.length===10,'Category count');
 for(const cat of cats)for(const difficulty of ['1','2','3']){
 const s=M.create(cfg({categories:[cat],difficulty}),words);M.step(s,'reveal',0,()=>0);ok(String(s.word.level)===difficulty,'Wrong filter');
 }
 });
 test('Four teams, malicious-looking names and corrupt saves are handled',()=>{
 const s=M.create(cfg({names:['<img src=x onerror=alert(1)>'.slice(0,24),'B','C','D']}),words);ok(s.teams.length===4,'Four teams rejected');
 for(const raw of ['{}','null','invalid',JSON.stringify({...s,idx:8}),JSON.stringify({...s,remaining:-1})]){
 let threw=false;try{M.restore(raw);}catch(e){threw=true;}ok(threw,'Corrupt save accepted');
 }
 });
 return count;
}
if(typeof module!=='undefined'&&module.exports){
 module.exports=runTests;
 if(require.main===module){
  const fs=require('node:fs'),vm=require('node:vm'),scope={window:{}};
  vm.runInNewContext(fs.readFileSync(__dirname+'/data.js','utf8'),scope);
  const count=runTests(require('./engine.js'),scope.window.MIMICA_WORDS);
  console.log(count+' checks passed.');
 }
}
