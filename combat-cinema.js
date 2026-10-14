/* Breads vs Aliens — Cinematic Combat V2. Visual-only layer. */
(() => {
'use strict';
const $fx = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r,ms));
const layer=document.createElement('div');layer.id='cinema-layer';document.body.appendChild(layer);
const motion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait=ms=>motion?Promise.resolve():sleep(ms);
let busy=false, sequence=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unitEl=(side,index)=>document.querySelectorAll('#'+(side==='player'?'player-board':'enemy-board')+' .minion')[index];
const heroEl=side=>$fx(side==='player'?'player-hero':'enemy-hero');
const center=el=>{const r=el?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;};
function spark(x,y,count=19,tint='gold'){
 if(motion)return;
 for(let i=0;i<count;i++){
  const e=document.createElement('i');e.className='cinema-spark '+tint;
  const a=(i/count)*Math.PI*2+Math.random()*.45,d=40+Math.random()*115;
  e.style.cssText='left:'+x+'px;top:'+y+'px;--dx:'+(Math.cos(a)*d)+'px;--dy:'+(Math.sin(a)*d)+'px;--delay:'+(Math.random()*120)+'ms';
  layer.appendChild(e);setTimeout(()=>e.remove(),1200);
 }
}
function textAt(pos,txt,type='damage'){
 if(!pos)return;
 const e=document.createElement('div');e.className='cinema-number '+type;e.textContent=txt;
 e.style.left=pos.x+'px';e.style.top=pos.y+'px';layer.appendChild(e);
 setTimeout(()=>e.remove(),1550);
}
function impact(target,damage,{heal=false}={}){
 const pos=center(target);if(!pos)return;
 if(target){target.classList.remove('cinema-hit');void target.offsetWidth;target.classList.add('cinema-hit');setTimeout(()=>target.classList.remove('cinema-hit'),1000);}
 spark(pos.x,pos.y,damage>=4?30:20,heal?'heal':'damage');
 textAt(pos,(heal?'+':'−')+damage,heal?'heal':'damage');
 if(target?.classList.contains('hero-card')){
   target.classList.add('cinema-hero-hurt');
   const portrait=target.querySelector('.hero-portrait');if(portrait){portrait.classList.remove('cinema-portrait-hit');void portrait.offsetWidth;portrait.classList.add('cinema-portrait-hit');}
   setTimeout(()=>target.classList.remove('cinema-hero-hurt'),1300);
 }
}
function title(message,sub=''){
 const e=document.createElement('div');e.className='cinema-title';e.innerHTML='<strong>'+esc(message)+'</strong><small>'+esc(sub)+'</small>';
 layer.appendChild(e);requestAnimationFrame(()=>e.classList.add('visible'));
 setTimeout(()=>{e.classList.remove('visible');setTimeout(()=>e.remove(),420)},1550);
}
function ghost(source,side){
 if(!source)return null;
 const r=source.getBoundingClientRect(),clone=source.cloneNode(true);
 clone.className='cinema-ghost';clone.removeAttribute('id');
 clone.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px';
 layer.appendChild(clone);return {node:clone,from:{x:r.left+r.width/2,y:r.top+r.height/2}};
}
async function fly(source,destination,damage,opts={}){
 const start=center(source),end=center(destination);
 if(!start||!end){impact(destination,damage);return;}
 const avatar=ghost(source);
 if(!motion&&avatar){
  avatar.node.style.setProperty('--tx',(end.x-start.x)+'px');
  avatar.node.style.setProperty('--ty',(end.y-start.y)+'px');
  avatar.node.classList.add('moving');
 }
 const beam=document.createElement('div');beam.className='cinema-trail';
 beam.style.left=start.x+'px';beam.style.top=start.y+'px';
 beam.style.setProperty('--dx',(end.x-start.x)+'px');beam.style.setProperty('--dy',(end.y-start.y)+'px');
 layer.appendChild(beam);
 await wait(580);
 impact(destination,damage);
 if(opts.retaliation)impact(source,opts.retaliation);
 await wait(420);
 avatar?.node.remove();beam.remove();
}
function summon(side,index,card,source){
 const dest=unitEl(side,index),pos=center(dest);
 if(!dest)return;
 if(!motion){dest.classList.add('cinema-summon');setTimeout(()=>dest.classList.remove('cinema-summon'),1100);}
 if(pos)spark(pos.x,pos.y,25,'gold');
 title(side==='player'?'CRIATURA INVOCADA':'INVOCAÇÃO ALIENÍGENA',card?.name||'');
 if(source&&pos&&!motion){
  const g=ghost(source);if(g){g.node.classList.add('cinema-summon-ghost');g.node.style.setProperty('--tx',(pos.x-g.from.x)+'px');g.node.style.setProperty('--ty',(pos.y-g.from.y)+'px');setTimeout(()=>g.node.remove(),1050);}
 }
}
const oldPlay=playCard;
playCard=function(i){
 if(busy)return;
 const id=p('player').hand[i],card=allCards[id],before=p('player').board.length;
 const source=document.querySelectorAll('#hand .card')[i];
 const sourceRect=source?.getBoundingClientRect();
 oldPlay.apply(this,arguments);
 if(card?.kind==='unit'&&p('player').board.length>before){
   const dest=unitEl('player',before);summon('player',before,card);
   if(sourceRect&&dest&&!motion){
    const r=dest.getBoundingClientRect(),g=document.createElement('img');g.src=card.art;g.className='cinema-card-flight';
    g.style.cssText='left:'+sourceRect.left+'px;top:'+sourceRect.top+'px;width:'+sourceRect.width+'px;height:'+sourceRect.height+'px;--tx:'+(r.left-sourceRect.left)+'px;--ty:'+(r.top-sourceRect.top)+'px';
    layer.appendChild(g);setTimeout(()=>g.remove(),1100);
   }
 }
};
const oldAttack=attackMinion;
attackMinion=function(ai,ei){
 if(busy)return;
 const attacker=unitEl('player',ai),defender=unitEl('enemy',ei);
 const a=p('player').board[ai],d=p('enemy').board[ei];if(!a||!d)return;
 const damage=a.attack,retaliation=d.attack,aname=allCards[a.id]?.name,dname=allCards[d.id]?.name;
 busy=true;aiBusy=true;
 title('ATAQUE!',aname+' → '+dname);
 const atk=ghost(attacker),def=ghost(defender);
 oldAttack.apply(this,arguments);render();
 const fakeAtk=atk?.node||attacker,fakeDef=def?.node||defender;
 (async()=>{await wait(230);await fly(fakeAtk,fakeDef,damage,{retaliation});atk?.node.remove();def?.node.remove();busy=false;aiBusy=false;render();checkEnd();})().catch(e=>{console.error(e);busy=false;aiBusy=false;render();});
};
const oldAttackHero=attackHero;
attackHero=function(i){
 if(busy)return;
 const a=p('player').board[i];if(!a)return;
 const attacker=unitEl('player',i),hero=heroEl('enemy'),hp=p('enemy').health;
 const atk=ghost(attacker);
 oldAttackHero.apply(this,arguments);
 if(p('enemy').health===hp){atk?.node.remove();return;}
 busy=true;aiBusy=true;
 title('ATAQUE DIRETO!',allCards[a.id]?.name+' → COMANDANTE ZORK');
 (async()=>{await wait(200);await fly(atk?.node||attacker,hero,a.attack);atk?.node.remove();busy=false;aiBusy=false;render();})().catch(e=>{console.error(e);busy=false;aiBusy=false;render();});
};
const oldExecute=executeAI;
executeAI=function(a){
 const me=p('enemy'),foe=p('player');
 const card=a.type==='unit'?allCards[me.hand[a.i]]:null;
 const source=a.type==='attack'||a.type==='face'?unitEl('enemy',a.i):null;
 const target=a.type==='attack'?unitEl('player',a.target):a.type==='face'?heroEl('player'):null;
 const atk=source?ghost(source):null,targetGhost=a.type==='attack'?ghost(target):null;
 const dmg=(a.type==='attack'||a.type==='face')?me.board[a.i]?.attack||0:0;
 const retaliation=a.type==='attack'?foe.board[a.target]?.attack||0:0;
 const before=me.board.length,playerHP=foe.health;
 oldExecute.apply(this,arguments);
 if(a.type==='unit'&&me.board.length>before){render();summon('enemy',before,card);}
 if(a.type==='attack'||a.type==='face'){
  render();
  title('ATAQUE ALIENÍGENA!',(source?.querySelector('.minion-name')?.textContent||'Alien')+' → '+(a.type==='face'?'SEU HERÓI':'CRIATURA'));
  fly(atk?.node||source,targetGhost?.node||target,dmg,{retaliation}).finally(()=>{atk?.node.remove();targetGhost?.node.remove();});
 }
 if(a.type==='spell'&&foe.health<playerHP){render();impact(heroEl('player'),playerHP-foe.health);}
};
const oldAiTurn=aiTurn;
aiTurn=function(){
 if(state.over)return;
 aiBusy=true;beginTurn('enemy');render();let safety=0;
 title('TURNO ALIENÍGENA','O COMANDANTE ZORK VAI AGIR');
 async function step(){
  if(state.over){aiBusy=false;return;}
  const choice=chooseAIAction();
  if(choice&&safety++<12){executeAI(choice);render();await wait(choice.type==='attack'||choice.type==='face'?1550:1300);return step();}
  aiBusy=false;state.active='player';state.turn++;beginTurn('player');
  setStatus('Seu turno! A mana foi recarregada e você comprou uma carta.');
  state.lastAction='“Os pães ainda estão de pé. Incrível...”';
  log('Zork encerrou o turno. Sua vez!');render();checkEnd();
  title('SEU TURNO!','PREPARE SEU PRÓXIMO MOVIMENTO');
 }
 setTimeout(()=>step().catch(console.error),1450);
};
const oldClick=clickMinion;
clickMinion=function(side,i){
 if(busy)return;
 const mode=targetMode,heroBefore=p('player').health;
 const target=unitEl(side,i),targetClone=mode==='damage'?ghost(target):null;
 oldClick.apply(this,arguments);
 if(mode==='damage'&&side==='enemy'){
  const t=targetClone?.node||unitEl('enemy',i);
  impact(t,3);setTimeout(()=>targetClone?.node.remove(),1100);
  title('FEITIÇO DE DANO!','−3 DE VIDA');
 }else if((mode==='buff'||mode==='shield')&&side==='player'){
  const el=unitEl('player',i),pos=center(el);if(pos)spark(pos.x,pos.y,25,'heal');
  title('CRIATURA FORTALECIDA','EFEITO ATIVADO');
 }
};
const oldStart=startGame;
startGame=function(){sequence++;busy=false;layer.innerHTML='';oldStart.apply(this,arguments);title('DUELO INICIADO','PÃES VS ALIENS');};
document.addEventListener('keydown',e=>{if(e.key==='Escape')layer.querySelectorAll('.cinema-title').forEach(el=>el.remove());});
title('PRONTO PARA O DUELO','EFEITOS CINEMATOGRÁFICOS ATIVOS');
})();
