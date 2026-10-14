/* Efeitos visuais opcionais; não modificam os cálculos de combate. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tooltip = document.createElement('div');
  tooltip.id = 'gf-tooltip';
  tooltip.setAttribute('role','tooltip');
  document.body.appendChild(tooltip);
  const banner = document.createElement('div');
  banner.id = 'gf-banner';
  banner.setAttribute('aria-live','polite');
  document.body.appendChild(banner);
  let bannerTimer;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const announce = (title, subtitle='') => {
    banner.innerHTML = '<strong>'+esc(title)+'</strong><small>'+esc(subtitle)+'</small>';
    banner.classList.add('gf-visible');
    clearTimeout(bannerTimer);
    bannerTimer=setTimeout(()=>banner.classList.remove('gf-visible'),1450);
  };
  const flash = (el,kind='gf-hit') => {
    if(!el || reduced) return;
    el.classList.remove(kind);
    void el.offsetWidth;
    el.classList.add(kind);
    setTimeout(()=>el.classList.remove(kind),620);
  };
  const floatDamage = (el,n) => {
    if(!el || reduced || !Number.isFinite(n) || n<=0)return;
    const r=el.getBoundingClientRect(),f=document.createElement('div');
    f.className='gf-float';f.textContent='−'+n;
    f.style.left=(r.left+r.width/2)+'px';f.style.top=(r.top+r.height/2)+'px';
    document.body.appendChild(f);setTimeout(()=>f.remove(),900);
  };
  const cardFromElement = el => {
    if(typeof allCards==='undefined'||typeof p!=='function')return null;
    const handCard=el.closest('#hand .card');
    if(handCard){const i=Array.prototype.indexOf.call(handCard.parentElement.children,handCard);return {card:allCards[p('player').hand[i]],unit:null};}
    const minion=el.closest('.board .minion');
    if(minion){const side=minion.closest('#player-board')?'player':'enemy';
      const i=Array.prototype.indexOf.call(minion.parentElement.children,minion);
      const unit=p(side).board[i];return {card:unit&&allCards[unit.id],unit};}
    return null;
  };
  const positionTooltip = (x,y) => {
    const w=tooltip.offsetWidth||285,h=tooltip.offsetHeight||160;
    tooltip.style.left=Math.max(12,Math.min(innerWidth-w-12,x+18))+'px';
    tooltip.style.top=Math.max(12,Math.min(innerHeight-h-12,y+18))+'px';
  };
  document.addEventListener('pointerover',e=>{
    if(e.pointerType==='touch')return;
    const target=e.target.closest('#hand .card,.board .minion');
    if(!target)return;
    const data=cardFromElement(target);if(!data?.card)return;
    const {card:c,unit:u}=data;
    tooltip.innerHTML='<div class="gf-tooltip-top"><img class="gf-tooltip-art" src="'+esc(c.art)+'" alt=""><div><div class="gf-tooltip-name">'+esc(c.name)+'</div><div class="gf-tooltip-kind">'+(c.kind==='spell'?'FEITIÇO':'CRIATURA')+' · '+esc(c.cost)+' MANA</div></div></div><div class="gf-tooltip-desc">'+esc(c.description)+'</div>'+(c.kind==='unit'?'<div class="gf-tooltip-stats">⚔ '+esc(u?.attack??c.attack)+' ATAQUE &nbsp; ♥ '+esc(u?.health??c.health)+' VIDA'+(u?.taunt?' · PROVOCAR':'')+'</div>':'');
    tooltip.classList.add('gf-visible');positionTooltip(e.clientX,e.clientY);
  });
  document.addEventListener('pointermove',e=>{if(tooltip.classList.contains('gf-visible'))positionTooltip(e.clientX,e.clientY)});
  document.addEventListener('pointerout',e=>{
    const source=e.target.closest('#hand .card,.board .minion');
    if(source&&!source.contains(e.relatedTarget))tooltip.classList.remove('gf-visible');
  });
  document.addEventListener('click',()=>tooltip.classList.remove('gf-visible'));
  const oldRenderHand=renderHand;
  renderHand=function(){oldRenderHand.apply(this,arguments);document.querySelectorAll('#hand .card').forEach(el=>el.removeAttribute('title'));};
  const oldRenderBoard=renderBoard;
  renderBoard=function(side){oldRenderBoard.apply(this,arguments);document.querySelectorAll('#'+(side==='player'?'player-board':'enemy-board')+' .minion').forEach(el=>el.removeAttribute('title'));};
  const oldPlayCard=playCard;
  playCard=function(i){
    const id=p('player').hand[i],c=allCards[id],before=p('player').board.length;
    oldPlayCard.apply(this,arguments);
    if(c&&p('player').board.length>before){
      const el=document.querySelector('#player-board .minion:last-child');flash(el,'gf-summon');
      announce('INVOCAÇÃO!',c.name);
    }else if(c&&c.kind==='spell'&&!p('player').hand.includes(id)&&!targetMode)announce('FEITIÇO!',c.name);
  };
  const oldClickMinion=clickMinion;
  clickMinion=function(side,i){
    const attacking=selectedAttacker!==null&&side==='enemy'&&!targetMode;
    const target=attacking?document.querySelectorAll('#enemy-board .minion')[i]:null;
    const defender=attacking?p('enemy').board[i]:null;
    const damage=attacking?p('player').board[selectedAttacker]?.attack:0;
    const targetedSpell=targetMode;
    oldClickMinion.apply(this,arguments);
    if(attacking){flash(target);floatDamage(target,damage);announce('ATAQUE!',defender?allCards[defender.id].name:'');}
    else if(targetedSpell&&!targetMode)announce('MAGIA ATIVADA!','Efeito resolvido');
  };
  const oldAttackHero=attackHero;
  attackHero=function(i){
    const u=p('player').board[i],n=u?.attack||0,before=p('enemy').health;
    oldAttackHero.apply(this,arguments);
    if(p('enemy').health<before){const el=document.getElementById('enemy-hero');flash(el);floatDamage(el,n);announce('ATAQUE DIRETO!',n+' de dano');}
  };
  const oldEndTurn=endTurn;
  endTurn=function(){const was=state.active;oldEndTurn.apply(this,arguments);if(was==='player'&&state.active==='enemy')announce('TURNO ALIENÍGENA','Comandante Zork está pensando');};
  const oldExecuteAI=executeAI;
  executeAI=function(a){
    const unit=a.type==='unit'?allCards[p('enemy').hand[a.i]]:null;
    const target=a.type==='attack'?document.querySelectorAll('#player-board .minion')[a.target]:a.type==='face'?document.getElementById('player-hero'):null;
    const damage=a.type==='attack'||a.type==='face'?p('enemy').board[a.i]?.attack:0;
    const before=p('enemy').board.length;
    oldExecuteAI.apply(this,arguments);
    if(a.type==='unit'&&p('enemy').board.length>before){flash(document.querySelector('#enemy-board .minion:last-child'),'gf-summon');announce('ZORK INVOCOU!',unit?.name||'Criatura alienígena');}
    if(a.type==='attack'||a.type==='face'){flash(target);floatDamage(target,damage);announce('ATAQUE ALIENÍGENA!',damage+' de dano');}
    if(a.type==='spell')announce('MAGIA ALIENÍGENA!','Zork ativou uma carta');
  };
  const oldBeginTurn=beginTurn;
  beginTurn=function(side){oldBeginTurn.apply(this,arguments);if(side==='player')announce('SEU TURNO!','Compre uma carta e prepare seu esquadrão');};
  const oldStartGame=startGame;
  startGame=function(){oldStartGame.apply(this,arguments);announce('DUELO INICIADO!','Pães vs Aliens');};
  announce('DUELO INICIADO!','Prepare seus Pães!');
})();
