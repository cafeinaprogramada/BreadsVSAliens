const $ = id => document.getElementById(id);
let allCards={}, state={}, selectedCard=null, selectedAttacker=null, targetMode=null, aiBusy=false, toastTimer=null;
const rand = arr => arr[Math.floor(Math.random()*arr.length)];
const shuffle = arr => {for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
function boot(){const data=window.CARD_DATA;allCards=Object.fromEntries(data.cards.map(c=>[c.id,c]));window.deckData=data.decks;startGame();}
function startGame(){
 state={turn:1,active:'player',over:false,players:{player:{health:30,maxMana:0,mana:0,deck:shuffle([...window.deckData.bread]),hand:[],board:[],fatigue:0},enemy:{health:30,maxMana:0,mana:0,deck:shuffle([...window.deckData.alien]),hand:[],board:[],fatigue:0}},logs:[],lastAction:''};
 selectedCard=null;selectedAttacker=null;targetMode=null;aiBusy=false;
 for(let i=0;i<3;i++) draw('player'); for(let i=0;i<4;i++) draw('enemy');
 state.players.player.maxMana=1;state.players.player.mana=1;state.players.player.board=[];state.players.enemy.board=[];
 log('O duelo começou! Você controla os Pães; o Comandante Zork controla os Aliens.');
 setStatus('Sua vez. Jogue uma carta ou examine o campo.'); render();
}
function p(side=state.active){return state.players[side]}
function draw(side){const pl=p(side);if(pl.deck.length){pl.hand.push(pl.deck.pop());}else{pl.fatigue++;pl.health-=pl.fatigue;log((side==='player'?'Você':'Zork')+' sofre '+pl.fatigue+' de dano por fadiga.');if(pl.health<=0) checkEnd();}}
function log(msg){if(!state.logs)state.logs=[];state.logs.unshift(msg);state.logs=state.logs.slice(0,35);const el=$('log');el.innerHTML=state.logs.map(x=>`<div class="log-entry">${escapeHtml(x)}</div>`).join('');}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setStatus(s){$('status').textContent=s;}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1800);}
function render(){
 if(!state.players)return;
 $('player-health').textContent=Math.max(0,p('player').health);$('enemy-health').textContent=Math.max(0,p('enemy').health);
 $('player-mana').textContent=`${p('player').mana} / ${p('player').maxMana} MANA`;$('enemy-mana').textContent=`${p('enemy').mana} / ${p('enemy').maxMana} MANA`;
 $('mana-text').textContent=`${p('player').mana} / ${p('player').maxMana}`;$('hand-count').textContent=`${p('player').hand.length} cartas`;
 $('deck-count').textContent=`DECKS ${p('player').deck.length} / ${p('enemy').deck.length}`;
 $('enemy-deck-visual')?.replaceChildren(...Array.from({length:Math.min(5,p('enemy').hand.length)},()=>{const el=document.createElement('div');el.className='enemy-card-back';el.textContent='✦';el.title='Carta oculta na mão de Zork';return el;}));
 $('enemy-hand-number')?.replaceChildren(document.createTextNode(p('enemy').hand.length+' CARTAS NA MÃO'));
 $('player-board-count').textContent=`${p('player').board.length} / 7`;$('enemy-board-count').textContent=`${p('enemy').board.length} / 7`;
 $('turn-label').textContent=state.active==='player'?'SEU TURNO':'TURNO ALIENÍGENA';
 $('round-label').textContent=`TURNO ${state.turn.toString().padStart(2,'0')}`;
 $('end-turn').disabled=state.active!=='player'||state.over||aiBusy;
 $('end-turn').style.opacity=state.active==='player'&&!state.over&&!aiBusy?'1':'.45';
 const gems=$('mana-gems');gems.innerHTML='';for(let i=0;i<p('player').maxMana;i++){const g=document.createElement('i');g.className='gem'+(i<p('player').mana?' full':'');g.classList.add('gem');gems.appendChild(g);}
 renderHand();renderBoard('player');renderBoard('enemy');
 $('action-title').textContent=targetMode?'Escolha um alvo':selectedAttacker!==null?'Escolha o alvo do ataque':'Sua vez de agir';
 $('action-help').textContent=targetMode==='buff'?'Selecione uma criatura aliada.':targetMode==='shield'?'Selecione um aliado para receber Provocar.':targetMode==='damage'?'Selecione uma criatura inimiga para receber 3 de dano.':selectedAttacker!==null?'Clique ou arraste até uma criatura inimiga ou o herói alienígena.':'Jogue cartas, ataque e encerre o turno.';
 $('ai-thought').textContent=state.active==='enemy'?'“Calculando probabilidades de vitória...”':state.lastAction||'“Analisando formas de vida...”';
}
function renderHand(){
 const hand=$('hand');hand.innerHTML='';
 p('player').hand.forEach((id,i)=>{const c=allCards[id];if(!c)return;const el=document.createElement('div');el.className='card'+(c.cost>p('player').mana||p('player').board.length>=7&&c.kind==='unit'?' disabled':'')+(selectedCard===i?' selected':'');el.title=`${c.name} · ${c.cost} mana\n${c.description}`;el.innerHTML=`<img src="${c.art}" alt=""><span class="card-cost">${c.cost}</span><span class="kind-mark">${c.kind==='spell'?'FEITIÇO':'CRIATURA'}</span><span class="card-name">${escapeHtml(c.name)}</span>${c.kind==='unit'?`<span class="card-stats"><b class="atk">⚔ ${c.attack}</b><b class="hp">♥ ${c.health}</b></span>`:'<span class="spell-mark">✦ EFEITO ✦</span>'}`;el.onclick=()=>playCard(i);hand.appendChild(el);});
}
function renderBoard(side){
 const board=$(side==='player'?'player-board':'enemy-board');board.innerHTML='';const units=p(side).board;
 if(!units.length){board.innerHTML='<span class="empty-board">— CAMPO LIVRE —</span>';return;}
 units.forEach((u,i)=>{const c=allCards[u.id];const el=document.createElement('div');const canAttack=side==='player'&&state.active==='player'&&u.ready&&!state.over;el.className='minion'+(canAttack?' ready':'')+(selectedAttacker===i?' selected':'')+(isTargetable(side,i)?' targetable':'');el.innerHTML=`<img src="${c.art}" alt=""><span class="cost">${c.cost}</span><span class="minion-name">${escapeHtml(c.name)}</span><span class="stat">${u.attack}</span><span class="stat hp">${u.health}</span>${u.taunt?'<span class="taunt">PROVOCAR</span>':''}`;el.title=`${c.name}\n${u.attack} ataque / ${u.health} vida${u.taunt?'\nProvocar':''}${u.ready?'\nPronto para atacar':''}`;el.onclick=()=>clickMinion(side,i);board.appendChild(el);});
}
function isTargetable(side,i){if(targetMode==='buff'||targetMode==='shield')return side==='player';if(targetMode==='damage')return side==='enemy';if(selectedAttacker!==null)return side==='enemy'&&(!p('enemy').board.some(u=>u.taunt)||p('enemy').board[i].taunt);return false;}
function playCard(i){
 if(state.over||state.active!=='player'||aiBusy||window.TCGMotion?.busy)return;const id=p('player').hand[i],c=allCards[id];if(!c)return;if(c.cost>p('player').mana){toast('Mana insuficiente!');return;}
 if(c.cost>p('player').mana){toast('Mana insuficiente!');return;}
 if(c.kind==='unit'&&p('player').board.length>=7){toast('Seu campo já tem 7 criaturas.');return;}
 if(c.kind==='spell'&&['buff','shield','damage'].includes(c.ability)){selectedCard=i;targetMode=c.ability;selectedAttacker=null;setStatus('Escolha o alvo destacado no campo.');render();return;}
 p('player').mana-=c.cost;p('player').hand.splice(i,1);
 if(c.kind==='unit'){const u={id,attack:c.attack,health:c.health,maxHealth:c.health,ready:false,taunt:c.ability==='guard'};p('player').board.push(u);log(`Você invocou ${c.name} (${u.attack}/${u.health}).`);triggerBattlecry('player',u,c);}
 else{resolveSpell('player',c,null);log(`Você lançou ${c.name}: ${c.description}`);}
 selectedCard=null;targetMode=null;render();checkEnd();
}
function clickMinion(side,i){
 if(state.over||state.active!=='player'||aiBusy||window.TCGMotion?.busy)return;
 if(targetMode){const c=allCards[p('player').hand[selectedCard]];if(!c)return;
   if((targetMode==='buff'||targetMode==='shield')&&side==='player'){p('player').mana-=c.cost;p('player').hand.splice(selectedCard,1);const u=p('player').board[i];if(targetMode==='buff'){u.attack+=2;u.health+=2;u.maxHealth+=2;log(`${c.name} fortaleceu ${allCards[u.id].name} em +2/+2.`);}else{u.taunt=true;u.health+=3;u.maxHealth+=3;log(`${c.name} protegeu ${allCards[u.id].name} com +3 de vida e Provocar.`);}targetMode=null;selectedCard=null;render();return;}
   if(targetMode==='damage'&&side==='enemy'){p('player').mana-=c.cost;p('player').hand.splice(selectedCard,1);damageMinion('enemy',i,3);log(`${c.name} causou 3 de dano a ${allCards[p('enemy').board[i]?.id||'alien1']?.name||'uma criatura'}.`);targetMode=null;selectedCard=null;cleanup('enemy');render();checkEnd();return;}
 }
 if(selectedAttacker!==null){if(side==='enemy'){if(p('enemy').board.some(u=>u.taunt)&&!p('enemy').board[i].taunt){toast('PROVOCAR: ataque primeiro a criatura com Provocar!');return;}const attacker=selectedAttacker;selectedAttacker=null;attackMinion(attacker,i);render();return;} }
 if(side==='player'){const u=p('player').board[i];if(u.ready){selectedAttacker=i;selectedCard=null;targetMode=null;setStatus('Escolha um alvo inimigo.');render();}else toast('Essa criatura ainda não pode atacar neste turno.');}
}
function triggerBattlecry(side,u,c){
 const own=p(side),foe=p(side==='player'?'enemy':'player');
 switch(c.ability){case'heal':own.health=Math.min(30,own.health+2);break;case'healall':own.health=Math.min(30,own.health+3);own.board.forEach(x=>{x.health=Math.min(x.maxHealth,x.health+3)});break;case'healminion':{const hurt=own.board.filter(x=>x!==u&&x.health<x.maxHealth);if(hurt.length){const t=hurt.sort((a,b)=>(a.health/a.maxHealth)-(b.health/b.maxHealth))[0];t.health=Math.min(t.maxHealth,t.health+2);}break;}case'ping':if(c.id==='bread12'){foe.health-=1;}else if(foe.board.length){const t=foe.board.slice().sort((a,b)=>a.health-b.health)[0];damageMinion(side==='player'?'enemy':'player',foe.board.indexOf(t),1);cleanup(side==='player'?'enemy':'player');}else foe.health-=1;break;}
}
function resolveSpell(side,c,target){
 const own=p(side),foe=p(side==='player'?'enemy':'player');
 switch(c.ability){
 case'heal':own.health=Math.min(30,own.health+3);toast('Seu herói recuperou 3 de vida.');break;
 case'damage':if(target!==null)damageMinion(side==='player'?'enemy':'player',target,3);break;
 case'damageall':foe.board.forEach(u=>u.health-=2);cleanup(side==='player'?'enemy':'player');break;
 case'buff':case'shield':break;
 }
}
function damageMinion(side,i,n){const u=p(side).board[i];if(!u)return;u.health-=n;if(u.health<=0){log(`${allCards[u.id].name} foi derrotado.`);p(side).board.splice(i,1);}else log(`${allCards[u.id].name} recebeu ${n} de dano.`);}
function cleanup(side){p(side).board=p(side).board.filter(u=>u.health>0);}
function attackMinion(ai,ei){if(p('enemy').board.some(u=>u.taunt)&&!p('enemy').board[ei]?.taunt){toast('PROVOCAR: ataque a criatura que protege o campo!');return;}const atk=p('player').board[ai],def=p('enemy').board[ei];if(!atk||!def)return;const attack=atk.attack;def.health-=attack;atk.health-=def.attack;atk.ready=false;log(`${allCards[atk.id].name} (${attack}) atacou ${allCards[def.id].name} (${def.attack}).`);if(def.health<=0)log(`${allCards[def.id].name} foi derrotado.`);if(atk.health<=0)log(`${allCards[atk.id].name} foi derrotado.`);cleanup('player');cleanup('enemy');}
function attackHero(i){const u=p('player').board[i];if(!u||!u.ready)return;if(p('enemy').board.some(x=>x.taunt)){toast('Você precisa atacar uma criatura com Provocar.');return;}p('enemy').health-=u.attack;u.ready=false;log(`${allCards[u.id].name} atacou o herói alienígena e causou ${u.attack} de dano.`);selectedAttacker=null;render();checkEnd();}
function clickHero(side){if(side==='enemy'&&selectedAttacker!==null){if(p('enemy').board.some(u=>u.taunt)){toast('PROVOCAR: elimine as criaturas com Provocar antes do ataque direto.');return;}attackHero(selectedAttacker);return;}if(targetMode)toast('Essa carta precisa de um alvo no campo.');}
$('player-hero').onclick=()=>clickHero('player');$('enemy-hero').onclick=()=>clickHero('enemy');
function endTurn(){if(state.over||state.active!=='player'||aiBusy||window.TCGMotion?.busy)return;selectedCard=null;selectedAttacker=null;targetMode=null;state.active='enemy';setStatus('Zork está calculando suas jogadas...');render();setTimeout(aiTurn,500);}
$('end-turn').onclick=endTurn;
function beginTurn(side){const pl=p(side);pl.maxMana=Math.min(10,pl.maxMana+1);pl.mana=pl.maxMana;draw(side);pl.board.forEach(u=>u.ready=true);}
function aiTurn(){
 if(state.over)return;aiBusy=true;beginTurn('enemy');render();let safety=0;
 async function step(){
  if(state.over){aiBusy=false;return;}
  const choice=chooseAIAction();if(choice&&safety++<18){if(window.TCGMotion)await window.TCGMotion.aiAction(choice);else{executeAI(choice);render();}await new Promise(r=>setTimeout(r,700));return step();}
  aiBusy=false;state.active='player';state.turn++;beginTurn('player');setStatus('Seu turno! A mana foi recarregada e você comprou uma carta.');state.lastAction='“Os pães ainda estão de pé. Incrível...”';log('Zork encerrou o turno. Sua vez!');render();checkEnd();window.TCGMotion?.banner('SEU TURNO','PREPARE O ESQUADRÃO');
 }
 window.TCGMotion?.banner('TURNO ALIENÍGENA','ZORK VAI AGIR');setTimeout(()=>step().catch(console.error),3200);
}
/* AI v2 — finite-state tactical planner; evaluates every action after each move. */
const AI_STYLES=[
 {id:'tempo',name:'Pressão de campo',aggression:1.2,trade:.75,hold:.8},
 {id:'control',name:'Controle e remoções',aggression:.65,trade:1.65,hold:1.15},
 {id:'swarm',name:'Exército numeroso',aggression:1.05,trade:1,hold:.5},
 {id:'fortress',name:'Fortaleza defensiva',aggression:.65,trade:1.35,hold:1.4},
 {id:'value',name:'Economia de recursos',aggression:.9,trade:1.1,hold:1.85},
 {id:'finisher',name:'Finalização agressiva',aggression:2.2,trade:.6,hold:.4}
];
let aiBrain={style:AI_STYLES[0],phase:'assess',turn:-1,plays:0,initialMana:0};
function aiPlan(){
 const me=p('enemy'),foe=p('player'),ready=me.board.filter(u=>u.ready),enemyPower=ready.reduce((n,u)=>n+u.attack,0);
 const ownPower=foe.board.reduce((n,u)=>n+u.attack,0);
 if(aiBrain.turn!==state.turn){
  const advantage=(me.board.reduce((n,u)=>n+u.attack+u.health*.55,0)-foe.board.reduce((n,u)=>n+u.attack+u.health*.55,0));
  let id=state.turn%5;
  if(me.health<=12||foe.health<=enemyPower+4)id=5;
  else if(ownPower>=me.health*.35||advantage< -5)id=3;
  else if(foe.board.length>=3)id=1;
  else if(me.hand.length<=2)id=4;
  else if(me.hand.filter(id=>allCards[id]?.cost<=2).length>=3)id=2;
  aiBrain={style:AI_STYLES[id],phase:'assess',turn:state.turn,plays:0,initialMana:me.mana};
 }
 return aiBrain;
}
function aiThreat(u){return u.attack*1.9+u.health*.7+(u.taunt?4:0)+(u.ready?1:0);}
function chooseAIAction(){
 const me=p('enemy'),foe=p('player'),brain=aiPlan(),style=brain.style;
 const taunts=foe.board.map((u,i)=>({u,i})).filter(x=>x.u.taunt);
 const attackers=me.board.map((u,i)=>({u,i})).filter(x=>x.u.ready&&x.u.attack>0);
 const totalAttack=attackers.reduce((n,x)=>n+x.u.attack,0);
 const mana=me.mana;
 // State 1: immediate lethal, including taunt clearance if possible.
 brain.phase='lethal';
 if(!taunts.length&&totalAttack>=foe.health&&attackers.length)return {type:'face',i:attackers[0].i};
 // State 2: tactical combat; always consider attacking a taunt, even if not a clean kill.
 brain.phase='combat';
 const targets=taunts.length?taunts:foe.board.map((u,i)=>({u,i}));
 let combat=[];
 for(const {u:a,i} of attackers){
  for(const {u:d,i:j} of targets){
   const kill=d.health<=a.attack,dead=a.health<=d.attack;
   const effective=Math.min(a.attack,d.health);
   let score=(kill?aiThreat(d)*style.trade:effective*(taunts.length?1.8:.7))
     -(dead?aiThreat(a)*.85:a.health>0?d.attack*.3:0)
     +(taunts.length?5:0)+(kill&&d.taunt?6:0);
   if(d.attack>=me.health&&kill)score+=9;
   combat.push({type:'attack',i,target:j,score});
  }
 }
 combat.sort((a,b)=>b.score-a.score);
 const bestTrade=combat[0];
 // State 3: prioritize urgent removal and profitable attacks.
 if(bestTrade&&(taunts.length||bestTrade.score>2.6)&&
    (bestTrade.score>=-3||taunts.length&&attackers.length))return {type:'attack',i:bestTrade.i,target:bestTrade.target};
 // State 4: decide which cards to invest. Preserve reserves rather than always spending all mana.
 brain.phase='develop';
 const actions=[];
 const reserve=me.hand.length<=2&&state.turn>3?1:0;
 for(let i=0;i<me.hand.length;i++){
  const c=allCards[me.hand[i]];if(!c||c.cost>mana)continue;
  if(c.kind==='unit'&&me.board.length<7){
   const boardCount=me.board.length,enemyCount=foe.board.length;
   let score=c.attack*1.05+c.health*.65-c.cost*.33;
   if(style.id==='swarm')score+=c.cost<=2?5:0;
   if(style.id==='fortress')score+=c.ability==='guard'?7:0;
   if(style.id==='tempo')score+=c.attack>=3?3:0;
   if(style.id==='value')score+=c.cost>=3?2:-1;
   if(style.id==='finisher')score+=c.attack*1.3;
   if(c.ability==='heal'&&me.health<=22)score+=4;
   if(c.ability==='guard'&&foe.board.length)score+=3;
   if(boardCount>=4)score-=3+(boardCount-4)*2;
   if(boardCount>=enemyCount+2)score-=2;
   if(me.hand.length<=2&&c.cost>=3&&foe.board.length===0)score-=2;
   if(c.cost===mana)score+=.8;
   actions.push({type:'unit',i,score});
  }
  if(c.kind==='spell'){
   if(c.ability==='damage'&&foe.board.length){
    const target=foe.board.reduce((best,u,j)=>aiThreat(u)>aiThreat(foe.board[best])?j:best,0);
    const u=foe.board[target];
    actions.push({type:'spell',i,target,score:3+(u.health<=3?aiThreat(u):0)+(u.taunt?5:0)+(style.id==='control'?4:0)});
   }
   if(c.ability==='damageall'&&foe.board.length>=2)actions.push({type:'spell',i,score:foe.board.length*3+(style.id==='control'?4:0)});
   if(c.ability==='heal'&&me.health<=24)actions.push({type:'spell',i,score:(30-me.health)*.75});
   if(c.ability==='shield'&&me.board.some(u=>!u.taunt)){
    const target=me.board.reduce((best,u,j)=>u.attack>me.board[best].attack&&!u.taunt?j:best,me.board.findIndex(u=>!u.taunt));
    actions.push({type:'spell',i,target,score:foe.board.length*1.3+(style.id==='fortress'?6:0)});
   }
   if(c.ability==='buff'&&me.board.length){
    const target=me.board.reduce((best,u,j)=>u.attack>me.board[best].attack?j:best,0);
    actions.push({type:'spell',i,target,score:me.board[target].ready?7:4});
   }
  }
 }
 actions.sort((a,b)=>b.score-a.score);
 // Do not hoard when in danger; do hold cards if dominating or resources are low.
 const pressured=foe.board.reduce((n,u)=>n+u.attack,0)>=me.health*.35;
 const boardLead=me.board.length>foe.board.length+1;
 const threshold=pressured?0:style.hold+(boardLead?2:0)+(me.hand.length<=2?1.5:0)+(brain.plays>=2?brain.plays*.9:0);
 if(actions.length&&actions[0].score>=threshold&&brain.plays<Math.min(5,style.id==='swarm'?5:3)){
  brain.plays++;
  return {type:actions[0].type,i:actions[0].i,target:actions[0].target};
 }
 // State 5: clear remaining threats or push hero damage.
 brain.phase='finish';
 if(bestTrade&&bestTrade.score>-2)return {type:'attack',i:bestTrade.i,target:bestTrade.target};
 if(!taunts.length&&attackers.length)return {type:'face',i:attackers[0].i};
 if(bestTrade&&taunts.length)return {type:'attack',i:bestTrade.i,target:bestTrade.target};
 brain.phase='pass';return null;
}
function executeAI(a){const me=p('enemy'),foe=p('player');
 if(a.type==='unit'){const id=me.hand.splice(a.i,1)[0],c=allCards[id];me.mana-=c.cost;const u={id,attack:c.attack,health:c.health,maxHealth:c.health,ready:false,taunt:c.ability==='guard'};me.board.push(u);triggerBattlecry('enemy',u,c);log(`Zork invocou ${c.name} (${u.attack}/${u.health}).`);state.lastAction='“'+aiBrain.style.name+': consolidando a estratégia.”';}
 if(a.type==='spell'){const id=me.hand[a.i],c=allCards[id];me.hand.splice(a.i,1);me.mana-=c.cost;if(c.ability==='damage'&&a.target!==undefined){damageMinion('player',a.target,3);}else if(c.ability==='buff'||c.ability==='shield'){const u=me.board[a.target]||me.board[0];if(u){if(c.ability==='buff'){u.attack+=2;u.health+=2;u.maxHealth+=2;}else{u.taunt=true;u.health+=3;u.maxHealth+=3;}}}else resolveSpell('enemy',c,null);log(`Zork usou ${c.name}.`);state.lastAction='“Recursos utilizados com eficiência.”';}
 if(a.type==='attack'){const at=me.board[a.i],de=foe.board[a.target];if(at&&at.ready&&de&&(!foe.board.some(u=>u.taunt)||de.taunt)){de.health-=at.attack;at.health-=de.attack;at.ready=false;log(`Alien ${allCards[at.id].name} atacou ${allCards[de.id].name}.`);cleanup('player');cleanup('enemy');}}
 if(a.type==='face'){const at=me.board[a.i];if(at&&at.ready&&!foe.board.some(u=>u.taunt)){foe.health-=at.attack;at.ready=false;log(`Zork atacou seu herói com ${allCards[at.id].name}, causando ${at.attack} de dano.`);}}
 checkEnd();
}
function checkEnd(){if(state.over)return;if(p('player').health<=0||p('enemy').health<=0){state.over=true;const win=p('enemy').health<=0; $('modal-symbol').textContent=win?'🏆':'👽';$('modal-title').textContent=win?'VITÓRIA DOS PÃES!':'A TORRE RESISTIU… NÃO';$('modal-text').textContent=win?'Você derrotou o Comandante Zork! Esta é a primeira vitória da torre — em breve poderemos adicionar o próximo adversário.':'Zork venceu este duelo. Cada derrota ajuda a ajustar os decks; tente outra estratégia e volte para a batalha.';$('modal').classList.remove('hidden');render();}}
$('restart').onclick=startGame;$('modal-restart').onclick=()=>{$('modal').classList.add('hidden');startGame();};
$('log-toggle').onclick=()=>$('log').classList.toggle('open');
try { boot(); } catch(e) { console.error(e); document.body.innerHTML='<div style="padding:30px;color:white">Não foi possível iniciar o jogo. Verifique cards-data.js e o console do navegador.</div>'; }
