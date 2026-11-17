/* Game rules shared by the browser and automated checks. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Mimica=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
function create(config,words,random=Math.random){
 const names=config.names.map(n=>n.trim());
 if(names.length<2||names.length>4||names.some(n=>!n||n.length>24)||new Set(names.map(n=>n.toLocaleLowerCase('pt-BR'))).size!==names.length)throw Error('Informe de 2 a 4 equipes com nomes diferentes (até 24 caracteres).');
 if(!Number.isInteger(config.seconds)||config.seconds<15||config.seconds>300)throw Error('Escolha um tempo inteiro entre 15 e 300 segundos.');
 if(!Number.isInteger(config.target)||config.target<1||config.target>500)throw Error('Escolha uma meta inteira entre 1 e 500 pontos.');
 if(!['single','many'].includes(config.mode)||!['mixed','1','2','3'].includes(config.difficulty))throw Error('Configuração inválida.');
 const pool=words.filter(w=>config.categories.includes(w.cat)&&(config.difficulty==='mixed'||w.level===Number(config.difficulty)));
 if(!pool.length)throw Error('Não há palavras nessa combinação de categorias e dificuldade.');
 const s={version:2,config:copy(config),pool:copy(pool),bags:{},teams:names.map(name=>({name,score:0})),idx:0,turn:0,phase:'ready',remaining:config.seconds*1000,deadline:0,word:null,history:[],turnPoints:0,message:'',lockUntil:0};
 return s;
}
function levels(s){return [...new Set(s.pool.map(w=>w.level))].sort();}
function turnLevel(s){const ls=levels(s);return ls[Math.floor(s.turn/s.teams.length)%ls.length];}
function draw(s,random=Math.random){
 const level=turnLevel(s),key=String(level);
 let bag=s.bags[key];
 if(!bag||!bag.length){
  bag=s.pool.filter(w=>w.level===level).map(w=>w.id);
  if(s.bags[key])s.message='Baralho desta dificuldade reembaralhado.';
  s.bags[key]=bag;
 }
 const choices=bag.filter(id=>id!==s.word?.id);
 const eligible=choices.length?choices:bag;
 const id=eligible[Math.floor(random()*eligible.length)];
 bag.splice(bag.indexOf(id),1);
 s.word=s.pool.find(w=>w.id===id);
}
function finish(s,message){
 s.phase='summary';s.deadline=0;s.message=message;
 if(s.teams[s.idx].score>=s.config.target){s.phase='finished';s.message='Meta alcançada!';}
}
function step(s,action,now=Date.now(),random=Math.random){
 if(action==='tick'){
  if(s.phase!=='running')return false;
  s.remaining=Math.max(0,s.deadline-now);
  if(!s.remaining){s.history.push({team:s.idx,word:s.word.word,points:0,result:'Tempo esgotado'});finish(s,'Tempo esgotado!');}
  return true;
 }
 if(['hit','pass','pause'].includes(action)&&s.phase==='running'){
  step(s,'tick',now,random);if(s.phase!=='running')return false;
 }
 switch(action){
 case 'reveal':if(s.phase!=='ready')return false;s.message='';draw(s,random);s.phase='revealed';break;
 case 'begin':if(s.phase!=='revealed')return false;s.phase='running';s.deadline=now+s.remaining;break;
 case 'hit':case 'pass':
  if(s.phase!=='running'||now<s.lockUntil)return false;
  s.lockUntil=now+500;
  const points=action==='hit'?s.word.level:0;
  s.teams[s.idx].score+=points;s.turnPoints+=points;
  s.history.push({team:s.idx,word:s.word.word,points,result:action==='hit'?'Acertou':'Passou'});
  if(s.teams[s.idx].score>=s.config.target)finish(s,'Meta alcançada!');
  else if(s.config.mode==='single')finish(s,action==='hit'?'Boa! Palavra acertada.':'Palavra passada.');
  else draw(s,random);
  break;
 case 'pause':if(s.phase!=='running')return false;s.phase='paused';s.deadline=0;break;
 case 'resume':if(s.phase!=='paused')return false;s.phase='running';s.deadline=now+s.remaining;s.lockUntil=now+300;break;
 case 'next':if(s.phase!=='summary')return false;s.idx=(s.idx+1)%s.teams.length;s.turn++;s.phase='ready';s.word=null;s.remaining=s.config.seconds*1000;s.turnPoints=0;s.message='';s.lockUntil=0;break;
 default:return false;
 }
 return true;
}
function restore(raw){
 const s=typeof raw==='string'?JSON.parse(raw):copy(raw);
 if(!s||s.version!==2||!s.config||!Array.isArray(s.pool)||!s.pool.length||!Array.isArray(s.teams)||!Array.isArray(s.history)||!s.bags)throw Error('Partida incompatível.');
 create({...s.config,names:s.teams.map(t=>t.name)},s.pool);
 if(s.teams.some(t=>!Number.isFinite(t.score)||t.score<0)||!Number.isInteger(s.idx)||s.idx<0||s.idx>=s.teams.length||!Number.isInteger(s.turn)||s.turn<0||!Number.isFinite(s.remaining)||s.remaining<0||s.remaining>s.config.seconds*1000||!['ready','revealed','running','paused','summary','finished'].includes(s.phase))throw Error('Partida inválida.');
 if(['revealed','running','paused'].includes(s.phase)&&(!s.word||!s.pool.some(w=>w.id===s.word.id)))throw Error('Palavra inválida.');
 if(s.phase==='running')s.phase='paused';
 s.deadline=0;s.lockUntil=0;return s;
}
return {create,step,restore,copy,turnLevel};
});
