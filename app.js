'use strict';
const $=id=>document.getElementById(id);
const M=window.Mimica, words=window.MIMICA_WORDS, KEY='mimica.partida.v2', AUDIO_KEY='mimica.audio.v2';
const colors=['#91c7ff','#ffa8c7','#d7f99a','#ffda88'], defaults=['Azul','Rosa','Verde','Amarela'], levelNames=['','Fácil','Média','Difícil'];
let game=null, undo=[], view='home', draft=null, lastSecond=-1, audioContext=null, audio={music:false,effects:true,voice:false};
function storageError(){$('storage-warning').hidden=false;}
try{const raw=localStorage.getItem(KEY);if(raw)game=M.restore(raw);}catch(e){try{localStorage.removeItem(KEY);}catch(ignore){}$('storage-warning').hidden=false;$('storage-warning').textContent='Não foi possível recuperar a partida anterior. Você pode começar uma nova.';}
try{Object.assign(audio,JSON.parse(localStorage.getItem(AUDIO_KEY)||'{}'));}catch(e){}
function save(){if(!game)return;try{localStorage.setItem(KEY,JSON.stringify(game));}catch(e){storageError();}}
function stopAudio(){ $('music-audio').pause(); for(const id of ['hit-audio','miss-audio']){$(id).pause();$(id).currentTime=0;}if(window.speechSynthesis)window.speechSynthesis.cancel();}
function playSound(id){if(!audio.effects)return;const el=$(id);el.currentTime=0;el.play().catch(()=>{});}
function music(){if(game?.phase==='running'&&view==='play'&&audio.music){$('music-audio').volume=.2;$('music-audio').play().catch(()=>{});}else $('music-audio').pause();}
function beep(){if(!audio.effects)return;try{audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.frequency.value=850;gain.gain.setValueAtTime(.07,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.12);oscillator.start();oscillator.stop(audioContext.currentTime+.13);}catch(e){}}
function speak(text){if(!audio.voice||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';window.speechSynthesis.speak(u);}
function show(id){view=id;document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==id);$('continue').hidden=!game;$('continue').textContent=game?.phase==='finished'?'Ver resultado da partida':'Continuar partida';music();window.scrollTo({top:0,behavior:'instant'});}
function home(){if(game?.phase==='running')act('pause');stopAudio();save();show('home');}
function buildTeams(){
 const names=[...document.querySelectorAll('.team-input')].map(el=>el.value);$('team-fields').replaceChildren();
 for(let i=0;i<Number($('team-count').value);i++){
 const wrap=document.createElement('div');wrap.className='field';const label=document.createElement('label');label.htmlFor='team-'+i;label.textContent='Equipe '+(i+1);label.style.color=colors[i];
 const input=document.createElement('input');input.id=label.htmlFor;input.className='team-input';input.value=names[i]??defaults[i];input.maxLength=24;input.required=true;input.autocomplete='off';wrap.append(label,input);$('team-fields').append(wrap);
 }}
$('team-count').addEventListener('change',buildTeams);buildTeams();
const icons=['⚡','🧑‍🚒','🐾','⚽','🎬','🌍','💡','🍿','🏅','☀️'];
[...new Set(words.map(w=>w.cat))].forEach((cat,i)=>{
 const label=document.createElement('label');label.className='chip';const input=document.createElement('input');input.type='checkbox';input.value=cat;input.checked=true;input.addEventListener('change',selectionCount);label.append(input,document.createTextNode(icons[i]+' '+cat));$('categories').append(label);
});
function categories(){return [...$('categories').querySelectorAll('input:checked')].map(el=>el.value);}
function selectionCount(){const cats=categories(),difficulty=$('difficulty').value;const n=words.filter(w=>cats.includes(w.cat)&&(difficulty==='mixed'||w.level===Number(difficulty))).length;$('selection-count').textContent=n+' palavras disponíveis nesta seleção.';}
$('difficulty').addEventListener('change',selectionCount);selectionCount();$('word-count').textContent=words.length;
$('setup-form').addEventListener('submit',e=>{
 e.preventDefault();$('setup-error').textContent='';
 const config={names:[...document.querySelectorAll('.team-input')].map(el=>el.value),seconds:Number($('seconds').value),target:Number($('target').value),mode:$('mode').value,difficulty:$('difficulty').value,categories:categories()};
 try{draft=M.create(config,words);}catch(err){$('setup-error').textContent=err.message;return;}
 if(game&&game.phase!=='finished'&&!window.confirm('Substituir a partida salva por esta nova partida?'))return;
 $('starter-list').replaceChildren();
 draft.teams.forEach((team,i)=>{const button=document.createElement('button');button.className='secondary';button.textContent=team.name;button.style.borderColor=colors[i];button.onclick=()=>start(i);$('starter-list').append(button);});show('starter');
});
function start(i){if(!draft)return;stopAudio();game=draft;draft=null;game.idx=i;undo=[];lastSecond=-1;save();render();}
function remember(){const snap=M.copy(game);if(snap.phase==='running'){snap.remaining=Math.max(1,game.deadline-Date.now());}undo.push(snap);if(undo.length>30)undo.shift();}
function act(action){
 if(!game)return;
 const now=Date.now();
 if(action==='pause'&&game.phase==='running'&&now>=game.deadline){expire();return;}
 if(['hit','pass'].includes(action)){
  if(game.phase!=='running'||now<game.lockUntil)return;
  if(now>=game.deadline){expire();return;}
  remember();
 }
 const changed=M.step(game,action,now);
 if(!changed)return;
 if(action==='hit')playSound('hit-audio');if(action==='pass')playSound('miss-audio');
 save();render();
 if(game.phase==='summary'||game.phase==='finished')speak('Placar. '+game.teams.map(t=>t.name+': '+t.score+' pontos').join('. '));
}
function expire(){
 if(!game||game.phase!=='running')return;
 remember();undo[undo.length-1].remaining=1000;
 M.step(game,'tick',Date.now());playSound('miss-audio');save();render();
 speak('Tempo esgotado. Placar. '+game.teams.map(t=>t.name+': '+t.score+' pontos').join('. '));
}
function undoResult(){
 if(!undo.length)return;stopAudio();game=M.restore(undo.pop());if(game.phase==='paused')game.message='Resultado desfeito. Retome quando estiver pronto.';save();render();
}
function updateTimer(){
 if(!game)return;
 const seconds=Math.ceil(game.remaining/1000);
 $('timer').textContent=seconds;$('timer').classList.toggle('urgent',seconds<=10&&game.phase==='running');
 $('time-fill').style.width=Math.max(0,Math.min(100,game.remaining/(game.config.seconds*1000)*100))+'%';
 if(game.phase==='running'&&seconds!==lastSecond&&seconds>0&&seconds<=10)beep();
 lastSecond=seconds;
}
function render(){
 if(!game){show('home');return;}
 if(game.phase==='finished'){renderVictory();return;}
 show('play');
 const active=game.teams[game.idx],p=game.phase,level=M.turnLevel(game);
 document.documentElement.style.setProperty('--team',colors[game.idx]);
 $('round-label').textContent='Rodada '+(Math.floor(game.turn/game.teams.length)+1)+' · '+levelNames[level];
 $('turn-label').textContent='Vez de '+active.name+' · meta '+game.config.target;
 $('scoreboard').replaceChildren();game.teams.forEach((t,i)=>{
  const box=document.createElement('div');box.className='score'+(i===game.idx?' active':'');if(i===game.idx)box.setAttribute('aria-current','true');
  const name=document.createElement('span');name.className='score-name';name.textContent=t.name+(i===game.idx?' · sua vez':'');
  const score=document.createElement('strong');score.textContent=t.score;const pts=document.createElement('small');pts.textContent='pontos';box.append(name,score,pts);$('scoreboard').append(box);
 });
 ['reveal','begin','running-actions','resume','next'].forEach(id=>$(id).hidden=true);
 if(p==='ready'){
  $('card-label').textContent='PASSE O CELULAR';$('word').textContent='Equipe '+active.name;$('word-help').textContent='Só quem vai fazer a mímica deve olhar. Toque abaixo para revelar a palavra.';$('reveal').hidden=false;
 }else if(p==='paused'){
  $('card-label').textContent='PARTIDA PAUSADA';$('word').textContent='Pode respirar.';$('word-help').textContent='A palavra está escondida e o relógio parou.';$('resume').hidden=false;
 }else if(p==='summary'){
  $('card-label').textContent='TURNO ENCERRADO';$('word').textContent='+'+game.turnPoints+' '+(game.turnPoints===1?'ponto':'pontos');$('word-help').textContent=game.message;$('next').hidden=false;
 }else{
  $('card-label').textContent=game.word.cat+' · '+levelNames[game.word.level];$('word').textContent=game.word.word;
  $('word-help').textContent='Vale '+game.word.level+' '+(game.word.level===1?'ponto':'pontos')+(p==='revealed'?' · Quando estiver pronto, inicie o turno.':' · Faça a mímica sem falar.');
  $(p==='revealed'?'begin':'running-actions').hidden=false;
 }
 $('play-message').textContent=p==='running'&&game.config.mode==='many'?'Acerte ou passe: o relógio continua!':p==='ready'?'Uma equipe, muitos gestos.':p==='paused'?game.message:game.message.includes('reembaralhado')?game.message:'';
 $('undo').hidden=!undo.length||p==='revealed'||p==='ready';
 $('turn-history').hidden=p!=='summary';$('history-list').replaceChildren();
 if(p==='summary'){
  // Consecutive history entries belong to the current team turn.
  const entries=game.history.slice().reverse();let count=0;
  for(const h of entries){if(h.team!==game.idx)break;const li=document.createElement('li');const name=document.createElement('span');name.textContent=h.word;const result=document.createElement('span');result.textContent=h.result+' · +'+h.points;li.append(name,result);$('history-list').prepend(li);if(++count>=100)break;}
 }
 updateTimer();music();
 // Focus the primary action after a transition, without moving focus on every tick.
 const focusTarget=p==='ready'?'reveal':p==='revealed'?'begin':p==='paused'?'resume':p==='summary'?'next':null;
 if(focusTarget)$(focusTarget).focus({preventScroll:true});
}
function renderVictory(){
 show('victory');stopAudio();const ranking=game.teams.map((t,i)=>({...t,i})).sort((a,b)=>b.score-a.score);
 $('winner').textContent=ranking[0].name+' venceu!';$('ranking').replaceChildren();
 ranking.forEach((t,i)=>{const li=document.createElement('li');const name=document.createElement('span');name.textContent=(i+1)+'. '+t.name;const score=document.createElement('strong');score.textContent=t.score+' pts';li.append(name,score);$('ranking').append(li);});$('victory-undo').hidden=!undo.length;
}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
 if(action==='home'){home();return;}
 if(action==='setup'){if(game?.phase==='running')act('pause');show('setup');return;}
 if(action==='continue'){render();return;}
 if(action==='rules'){show('rules');return;}
 if(action==='random'){if(draft)start(Math.floor(Math.random()*draft.teams.length));return;}
 if(action==='rematch'){
  if(!game)return;const config=M.copy(game.config);const starter=(game.idx+1)%game.teams.length;draft=M.create(config,words);start(starter);return;
 }
 if(action==='undo'){undoResult();return;}
 act(action);
});
$('home-link').addEventListener('click',home);
for(const key of ['music','effects','voice']){
 $(key).checked=!!audio[key];$(key).addEventListener('change',()=>{
 audio[key]=$(key).checked;if(key==='voice'&&!audio.voice&&window.speechSynthesis)window.speechSynthesis.cancel();if(key==='effects'&&!audio.effects){for(const id of ['hit-audio','miss-audio'])$(id).pause();}
 try{localStorage.setItem(AUDIO_KEY,JSON.stringify(audio));}catch(e){}music();
 });
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(game?.phase==='running')act('pause');stopAudio();save();}});
window.addEventListener('pagehide',()=>{if(game?.phase==='running'){M.step(game,'pause',Date.now());}save();});
setInterval(()=>{
 if(!game||game.phase!=='running')return;
 if(Date.now()>=game.deadline){expire();return;}
 M.step(game,'tick',Date.now());const changed=Math.ceil(game.remaining/1000)!==lastSecond;updateTimer();if(changed)save();
},150);
show('home');
