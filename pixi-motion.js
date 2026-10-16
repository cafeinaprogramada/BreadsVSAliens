/* PIXI.js visual renderer. Game rules stay in game.js. */
(()=>{
'use strict';
const motion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const root=document.createElement('div');root.id='pixi-effects';document.body.appendChild(root);
let app=null,active=false,busy=false,drag=null,seq=0,suppressClick=false;
const fx={get busy(){return busy},banner,aiAction};
window.TCGMotion=fx;
const P=window.PIXI;
if(P){try{
 app=new P.Application({width:innerWidth,height:innerHeight,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true});
 root.appendChild(app.view);active=true;
 window.addEventListener('resize',()=>app.renderer.resize(innerWidth,innerHeight));
}catch(e){console.warn('PixiJS indisponível; usando animação CSS',e);}}
const overlay=document.createElement('div');overlay.id='tcg-overlay';document.body.appendChild(overlay);
function point(el){if(!el?.isConnected)return null;const r=el.getBoundingClientRect();if(!r.width||!r.height||!Number.isFinite(r.left+r.top))return null;return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};}
const unit=(side,i)=>document.querySelectorAll('#'+(side==='player'?'player-board':'enemy-board')+' .minion')[i];
const hero=side=>document.getElementById(side==='player'?'player-hero':'enemy-hero');
const cardImg=el=>el?.querySelector('img')?.getAttribute('src');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot','"':'&quot;'}[c]));
const notices=[];let noticeActive=false;
function banner(name,detail=''){
 notices.push({name,detail});
 if(noticeActive)return;
 (async function runNotices(){
  noticeActive=true;
  while(notices.length){
   const msg=notices.shift(),el=document.createElement('div');el.className='tcg-banner';
   window.TCGAudio?.play('notification',200);
   const title=document.createElement('strong');title.textContent=msg.name;
   const sub=document.createElement('small');sub.textContent=msg.detail;el.append(title,sub);overlay.appendChild(el);
   await sleep(70);el.classList.add('visible');
   await sleep(3500);el.classList.remove('visible');
   await sleep(650);el.remove();
   await sleep(180);
  }
  noticeActive=false;
 })().catch(e=>{console.error(e);noticeActive=false;});
}
function num(target,n,positive=false){
 const p=point(target);if(!p||!n)return;
 const el=document.createElement('b');el.className='tcg-damage '+(positive?'healing':'');el.textContent=(positive?'+':'−')+n;
 el.style.left=p.x+'px';el.style.top=p.y+'px';overlay.appendChild(el);setTimeout(()=>el.remove(),2400);
 if(target?.classList.contains('hero-card')){
 target.classList.remove('tcg-hero-impact');void target.offsetWidth;target.classList.add('tcg-hero-impact');
 setTimeout(()=>target.classList.remove('tcg-hero-impact'),1050);
 }
}
function burst(pos,color=0xffa34b,count=28){
 if(!pos)return;
 if(active){
  for(let i=0;i<count;i++){
   const g=new P.Graphics();const a=Math.random()*Math.PI*2,dist=40+Math.random()*120;
   g.beginFill(i%3?color:0xffffff).drawCircle(0,0,2+Math.random()*4).endFill();g.x=pos.x;g.y=pos.y;app.stage.addChild(g);
   tween(680,t=>{g.x=pos.x+Math.cos(a)*dist*t;g.y=pos.y+Math.sin(a)*dist*t-20*t*t;g.alpha=1-t;g.scale.set(1-t*.7);}).then(()=>{app.stage.removeChild(g);g.destroy();});
  }
 }else{
  for(let i=0;i<Math.min(count,75);i++){const e=document.createElement('i');e.className='tcg-particle';e.style.left=pos.x+'px';e.style.top=pos.y+'px';e.style.setProperty('--x',(Math.random()-.5)*220+'px');e.style.setProperty('--y',(Math.random()-.5)*190+'px');overlay.appendChild(e);setTimeout(()=>e.remove(),850);}
 }
}
function tween(ms,cb){return new Promise(resolve=>{const start=performance.now();function tick(now){let t=Math.min(1,(now-start)/ms);cb(t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2);if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});}
function sprite(src,pos){
 if(!active||!src||!pos)return null;
 try{const s=P.Sprite.from(src);s.anchor.set(.5);s.x=pos.x;s.y=pos.y;s.width=pos.w;s.height=pos.h;s.zIndex=100;app.stage.addChild(s);return s;}catch(e){return null;}
}
function remove(s){if(s&&app){app.stage.removeChild(s);s.destroy();}}
async function travel(srcEl,dstEl,srcUrl,damage,returnDamage=0){
 const a=point(srcEl),b=point(dstEl);if(!a||!b){console.warn('Ataque sem alvo visual válido; dano resolvido sem animação.');window.TCGAudio?.play('attack');if(returnDamage>0)setTimeout(()=>window.TCGAudio?.play('attack'),180);return;}
 const sp=null; // Do not project card artwork through PIXI: original texture scale can fill the viewport.
 const fallback=null; // The field-sized DOM ghost below is the only moving card.
 if(fallback){fallback.className='tcg-moving-card';fallback.src=srcUrl||cardImg(srcEl)||'';fallback.style.width=a.w+'px';fallback.style.height=a.h+'px';overlay.appendChild(fallback);}
 const line=active?new P.Graphics():null;
 if(line)app.stage.addChild(line);
 if(srcEl)srcEl.classList.add('tcg-in-flight');
 const attackerGhost=srcEl?.cloneNode(true);if(attackerGhost){attackerGhost.removeAttribute('id');attackerGhost.className='tcg-attack-ghost';attackerGhost.style.width=Math.min(a.w,110)+'px';attackerGhost.style.height=Math.min(a.h,140)+'px';attackerGhost.style.maxWidth='110px';attackerGhost.style.maxHeight='140px';attackerGhost.style.position='fixed';attackerGhost.style.left=a.x+'px';attackerGhost.style.top=a.y+'px';attackerGhost.style.transform='translate(-50%,-50%)';overlay.appendChild(attackerGhost);srcEl.style.opacity='0.15';}
 await tween(1150,t=>{
  const arc=Math.sin(Math.PI*t)*-65;
  if(sp){sp.x=a.x+(b.x-a.x)*t;sp.y=a.y+(b.y-a.y)*t+arc;sp.rotation=Math.sin(Math.PI*t)*.12;sp.scale.set(1+Math.sin(Math.PI*t)*.28);}
  if(attackerGhost){attackerGhost.style.left=(a.x+(b.x-a.x)*t)+'px';attackerGhost.style.top=(a.y+(b.y-a.y)*t+arc)+'px';attackerGhost.style.transform='translate(-50%,-50%) scale('+(1+Math.sin(Math.PI*t)*.2)+')';}
  if(fallback){fallback.style.left=(a.x+(b.x-a.x)*t)+'px';fallback.style.top=(a.y+(b.y-a.y)*t+arc)+'px';fallback.style.transform='translate(-50%,-50%) scale('+(1+Math.sin(Math.PI*t)*.3)+')';}
  if(line){line.clear();line.lineStyle(4,0xffd780,.6);line.moveTo(a.x,a.y);line.lineTo(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t+arc);}
 });
 window.TCGAudio?.play('attack');
 if(returnDamage>0)setTimeout(()=>window.TCGAudio?.play('attack'),180);
 burst(b,0xff6748,75);setTimeout(()=>burst(b,0xffd68c,30),200);num(dstEl,damage);if(returnDamage){burst(a,0x64ccff,16);num(srcEl,returnDamage);}
 if(dstEl){dstEl.classList.remove('tcg-impact');void dstEl.offsetWidth;dstEl.classList.add('tcg-impact');setTimeout(()=>dstEl.classList.remove('tcg-impact'),900);}
 await sleep(700);
 await tween(350,t=>{if(sp){sp.x=b.x+(a.x-b.x)*t;sp.y=b.y+(a.y-b.y)*t;sp.alpha=1-t*.4;}
  if(attackerGhost){attackerGhost.style.left=(b.x+(a.x-b.x)*t)+'px';attackerGhost.style.top=(b.y+(a.y-b.y)*t)+'px';attackerGhost.style.opacity=String(1-t*.35);}
  if(fallback){fallback.style.left=(b.x+(a.x-b.x)*t)+'px';fallback.style.top=(b.y+(a.y-b.y)*t)+'px';fallback.style.opacity=String(1-t*.35);}});
 if(srcEl){srcEl.classList.remove('tcg-in-flight');srcEl.style.opacity='';}attackerGhost?.remove();
 remove(sp);fallback?.remove();if(line){app.stage.removeChild(line);line.destroy();}
}
function summon(target,srcUrl,origin,special=false){
 const pos=point(target);if(!pos)return;
 window.TCGAudio?.play(target?.classList.contains('tcg-taunt')||target?.querySelector('.taunt')?.textContent.includes('PROVOCAR')?'guard':'summon');
 if(target?.dataset?.cardName==='O Santo Grão'){
  target.classList.remove('tcg-soft-arrival','tcg-guard-drop','tcg-rainbow-arrival');
  target.classList.add('tcg-holy-arrival');
  const colors=[0xfff4c0,0xffffff,0xffd36c,0xfff9e0,0xffe49b];
  colors.forEach((color,i)=>setTimeout(()=>burst(pos,color,26),i*180));
  const halo=document.createElement('div');halo.className='tcg-holy-halo';
  halo.style.left=pos.x+'px';halo.style.top=pos.y+'px';overlay.appendChild(halo);
  setTimeout(()=>{halo.remove();target?.classList.remove('tcg-holy-arrival');},2500);
  return;
 }
 if(special){const colors=[0xff4242,0xffaa33,0xffeb48,0x61f5a0,0x5ddaff,0x9b68ff,0xff79d5];colors.forEach((color,i)=>setTimeout(()=>burst(pos,color,22),i*105));target?.classList.add('tcg-rainbow-arrival');setTimeout(()=>target?.classList.remove('tcg-rainbow-arrival'),1900);}else{target?.classList.add('tcg-soft-arrival');setTimeout(()=>target?.classList.remove('tcg-soft-arrival'),1150);if(target?.classList.contains('tcg-taunt')||target?.querySelector('.taunt')?.textContent.includes('PROVOCAR')){target.classList.add('tcg-guard-drop');setTimeout(()=>target.classList.remove('tcg-guard-drop'),1250);}}
 // Do not stack tcg-arrival over tcg-soft-arrival or rainbow; conflicting transforms cancel entry motion.
 // The card itself performs its field entrance; no floating full-resolution artwork.
}
async function aiAction(choice){
 const side='enemy',src=unit(side,choice.i),dest=choice.type==='attack'?unit('player',choice.target):choice.type==='face'?hero('player'):null;
 const a=p('enemy').board[choice.i],d=choice.type==='attack'?p('player').board[choice.target]:null;
 const attack=a?.attack||0,retaliation=d?.attack||0,art=a?allCards[a.id]?.art:null;
 const card=choice.type==='unit'?allCards[p('enemy').hand[choice.i]]:null;
 if(choice.type==='spell'){
  const preview=document.getElementById('card-inspect');
  const spell=allCards[p('enemy').hand[choice.i]];
  if(preview&&spell){
   enemyPreviewLock=true;clearTimeout(inspectTimer);
   preview.replaceChildren();preview.classList.add('inspect-visible','enemy-spell-preview');
   const image=document.createElement('img');image.src=spell.art;image.alt=spell.name;
   const name=document.createElement('strong');name.textContent=spell.name;
   const cost=document.createElement('small');cost.textContent=spell.cost+' MANA · FEITIÇO DE '+rivalName().toUpperCase();
   const description=document.createElement('p');description.textContent=spell.description||'Feitiço do adversário';
   preview.append(image,name,cost,description);
   window.TCGAudio?.play('spell');
  }
  await sleep(4000);
  executeAI(choice);render();
  if(preview){preview.classList.remove('inspect-visible','enemy-spell-preview');preview.replaceChildren();const placeholder=document.createElement('div');placeholder.className='inspect-placeholder';placeholder.textContent='Passe o cursor sobre uma carta para inspecioná-la.';preview.appendChild(placeholder);}
  enemyPreviewLock=false;
  banner('FEITIÇO DE '+rivalName().toUpperCase(),spell?spell.name+' — '+(spell.description||'Efeito aplicado') :'Magia do adversário');
  await sleep(1700);return;
 }
 if(choice.type==='attack'||choice.type==='face'){
  banner('ATAQUE DE '+rivalName().toUpperCase(),allCards[a.id]?.name+' → '+(d?allCards[d.id]?.name:'SEU HERÓI'));
  await sleep(480);await travel(src,dest,art,attack,retaliation);
  executeAI(choice);render();await sleep(200);return;
 }
 executeAI(choice);render();
 if(choice.type==='unit'){banner(card?.name==='O Santo Grão'?'✦ INVOCAÇÃO CELESTIAL ✦':'INVOCAÇÃO DE '+rivalName().toUpperCase(),card?.name||'');}
 
 await sleep(1500);
}
let enemyPreviewLock=false;
const originalInspect=inspectCard;
inspectCard=function(){if(enemyPreviewLock)return;return originalInspect.apply(this,arguments);};
const originalHideInspect=hideInspect;
hideInspect=function(){if(enemyPreviewLock)return;return originalHideInspect.apply(this,arguments);};
const originalPlay=playCard;
playCard=function(i){
 if(busy)return;
 const c=allCards[p('player').hand[i]],src=document.querySelectorAll('#hand .card')[i],origin=point(src),before=p('player').board.length,manaBefore=p('player').mana;
 originalPlay.apply(this,arguments);
 if(c?.kind==='spell'&&p('player').mana<manaBefore){window.TCGAudio?.play('spell');}
 if(c?.kind==='spell'&&p('player').hand.length!==undefined){const buff=['buff','shield','poisonbuff','chargebuff','teamBuff'].includes(c.ability);if(buff)document.querySelectorAll('#player-board .minion').forEach(el=>{el.classList.add('tcg-enchanted');setTimeout(()=>el.classList.remove('tcg-enchanted'),1200);});}
 if(c?.kind==='unit'&&p('player').board.length>before){
  const special=['Sonho de Blueberry','Sonho de Menta','Vermelhinha'].includes(c.name);
  // Summons animate the actual minion card; never enlarge a PIXI artwork sprite.
  banner(c.name==='O Santo Grão'?'✦ INVOCAÇÃO CELESTIAL ✦':special?'✦ INVOCAÇÃO ARCO-ÍRIS ✦':'CRIATURA INVOCADA',c.name);
 }
};
const originalAttack=attackMinion;
attackMinion=function(ai,ei){
 if(busy)return;
 const a=p('player').board[ai],d=p('enemy').board[ei];
 if(!a||!d||!a.ready)return;
 if(p('enemy').board.some(u=>u.taunt)&&!d.taunt){toast('PROVOCAR: ataque a criatura com Provocar!');return;}
 const src=unit('player',ai),dst=unit('enemy',ei),art=allCards[a.id].art,damage=a.attack,ret=d.attack;
 busy=true;aiBusy=true;selectedAttacker=null;
 banner('ATAQUE!',allCards[a.id].name+' → '+allCards[d.id].name);
 (async()=>{await sleep(250);await travel(src,dst,art,damage,ret);originalAttack(ai,ei);busy=false;aiBusy=false;render();checkEnd();})().catch(e=>{console.error(e);busy=false;aiBusy=false;render();});
};
const originalHero=attackHero;
attackHero=function(i){
 if(busy)return;
 const a=p('player').board[i];if(!a||!a.ready||a.rushOnly){if(a?.rushOnly)toast('INVESTIDA: neste turno, esta carta só pode atacar criaturas.');return;}
 if(p('enemy').board.some(u=>u.taunt)){toast('PROVOCAR: ataque primeiro a criatura com Provocar!');return;}
 const src=unit('player',i),dst=hero('enemy'),art=allCards[a.id].art,damage=a.attack;
 busy=true;aiBusy=true;selectedAttacker=null;
 banner('ATAQUE DIRETO!',allCards[a.id].name+' → '+rivalName().toUpperCase());
 (async()=>{await sleep(250);await travel(src,dst,art,damage);originalHero(i);busy=false;aiBusy=false;render();})().catch(e=>{console.error(e);busy=false;aiBusy=false;render();});
};
function dragBegin(e){
 if(e.button!==0||busy||aiBusy||state.active!=='player'||state.over)return;
 const card=e.target.closest('#hand .card'),minion=e.target.closest('#player-board .minion');
 if(!card&&!minion)return;
 const el=card||minion,idx=Array.from(el.parentElement.children).indexOf(el);
 const data=card?allCards[p('player').hand[idx]]:p('player').board[idx];
 if(!data)return;
 drag={el,idx,card:!!card,x:e.clientX,y:e.clientY,moved:false,preview:null,source:point(el)};
}
document.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
document.addEventListener('pointerdown',dragBegin);
document.addEventListener('pointermove',e=>{
 if(!drag)return;
 const dist=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);
 if(dist<9&&!drag.moved)return;
 if(!drag.moved){
  drag.moved=true;const el=document.createElement('div');el.className='tcg-drag-card';
  const image=drag.el.querySelector('img');if(image){const img=image.cloneNode(true);el.appendChild(img);}
  overlay.appendChild(el);drag.preview=el;drag.el.classList.add('tcg-drag-source');
 }
 if(drag.preview){drag.preview.style.left=e.clientX+'px';drag.preview.style.top=e.clientY+'px';}
 const over=document.elementFromPoint(e.clientX,e.clientY);
 document.querySelectorAll('.tcg-drop-target').forEach(x=>x.classList.remove('tcg-drop-target'));
 const target=over?.closest('#enemy-hero,#enemy-board .minion,#player-board,.battlefield,#player-board .minion');
 if(target)target.classList.add('tcg-drop-target');
});
document.addEventListener('pointerup',e=>{
 if(!drag)return;
 const d=drag;drag=null;
 d.preview?.remove();d.el.classList.remove('tcg-drag-source');
 document.querySelectorAll('.tcg-drop-target').forEach(x=>x.classList.remove('tcg-drop-target'));
 if(!d.moved)return;
 suppressClick=true;setTimeout(()=>{suppressClick=false;},80);
 const target=document.elementFromPoint(e.clientX,e.clientY);
 if(d.card){
  const friendly=target?.closest('#player-board .minion'),enemyTarget=target?.closest('#enemy-board .minion');
  const c=allCards[p('player').hand[d.idx]];
  if(c?.kind==='spell'&&['buff','shield','poisonbuff','chargebuff'].includes(c.ability)&&friendly){playCard(d.idx);clickMinion('player',Array.from(document.querySelectorAll('#player-board .minion')).indexOf(friendly));}
  else if(c?.kind==='spell'&&c.ability==='damage'&&enemyTarget){playCard(d.idx);clickMinion('enemy',Array.from(document.querySelectorAll('#enemy-board .minion')).indexOf(enemyTarget));}
  else if(target?.closest('#player-board,.battlefield,#enemy-board'))playCard(d.idx);
 }else{
  const enemy=target?.closest('#enemy-board .minion'),heroTarget=target?.closest('#enemy-hero');
  if(enemy){attackMinion(d.idx,Array.from(document.querySelectorAll('#enemy-board .minion')).indexOf(enemy));}
  else if(heroTarget)attackHero(d.idx);
 }
});
document.addEventListener('pointercancel',()=>{drag?.preview?.remove();drag?.el?.classList.remove('tcg-drag-source');drag=null;});
const info=document.createElement('div');info.id='tcg-rule-tip';info.textContent='PROVOCAR — Esta criatura protege seus aliados. Enquanto estiver em campo, ataques de criaturas inimigas devem escolhê-la antes de atacar outros alvos.';document.body.appendChild(info);
document.addEventListener('pointerover',e=>{const t=e.target.closest('.minion .taunt');if(t){info.classList.add('visible');const r=t.getBoundingClientRect();info.style.left=Math.min(innerWidth-310,Math.max(8,r.left))+'px';info.style.top=Math.max(8,r.top-108)+'px';}});
document.addEventListener('pointerout',e=>{if(e.target.closest('.minion .taunt'))info.classList.remove('visible');});
let previousVisualSnapshot={player:[],enemy:[]};
let visualSnapshotReady=false;
const originalRender=render;
render=function(){if(!state.players)return;originalRender.apply(this,arguments);
 const taunts=p('enemy').board.some(u=>u.taunt);
 for(const side of ['player','enemy']){
 const previous=previousVisualSnapshot[side]||[];
 document.querySelectorAll('#'+side+'-board .minion').forEach((el,i)=>{
  const fresh=visualSnapshotReady&&(i>=previous.length||previous[i]?.id!==p(side).board[i]?.id);
  if(fresh){const card=allCards[p(side).board[i].id];el.dataset.cardName=card?.name||'';summon(el,card?.art,null,['Sonho de Blueberry','Sonho de Menta','Vermelhinha'].includes(card?.name));}
  const u=p(side).board[i],old=previous[i];el.classList.toggle('tcg-poison-aura',!!u?.poison);
  if(old&&old.id===u?.id){
   if(u.health<old.health){el.classList.add('tcg-red-hit');setTimeout(()=>el.classList.remove('tcg-red-hit'),1400);}
   if(u.attack>old.attack||u.maxHealth>old.maxHealth||u.poison&&!old.poison||u.taunt&&!old.taunt||u.ready&&!old.ready&&u.rushOnly){el.classList.add('tcg-enchanted');setTimeout(()=>el.classList.remove('tcg-enchanted'),1500);}
  }
 });
 previousVisualSnapshot[side]=p(side).board.map(u=>({...u}));
}
 visualSnapshotReady=true;
 document.getElementById('enemy-hero')?.classList.toggle('tcg-legal-target',selectedAttacker!==null&&!taunts);
 document.querySelectorAll('#enemy-board .minion').forEach((el,i)=>{el.classList.toggle('tcg-legal-target',selectedAttacker!==null&&(!taunts||p('enemy').board[i].taunt));el.classList.toggle('tcg-taunt',!!p('enemy').board[i]?.taunt);});
 document.querySelectorAll('#player-board .minion').forEach((el,i)=>el.classList.toggle('tcg-taunt',!!p('player').board[i]?.taunt));
};
const originalStart=startGame;
startGame=function(){previousVisualSnapshot={player:[],enemy:[]};visualSnapshotReady=false;enemyPreviewLock=false;seq++;busy=false;overlay.innerHTML='';if(app)app.stage.removeChildren().forEach(x=>x.destroy());originalStart.apply(this,arguments);banner('DUELO INICIADO',(window.TCGMenu?.name(window.TCGMenu?.match.player)||'Pães')+' VS '+(window.TCGMenu?.name(window.TCGMenu?.match.enemy)||'Aliens'));};
if(state.players){render();banner(active?'PIXI.JS ATIVO':'MODO COMPATÍVEL','ARRASTE CARTAS PARA JOGAR E ATACAR');}
})();
