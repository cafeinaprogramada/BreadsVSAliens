const $ = id => document.getElementById(id);
let allCards={}, state={}, selectedCard=null, selectedAttacker=null, targetMode=null, aiBusy=false, toastTimer=null;
const rivalName=()=>window.TCGMenu?.name(window.TCGMenu?.match?.enemy)||'Adversário';
const rivalFaction=()=>window.TCGMenu?.match?.enemy||'alien';
const rand = arr => arr[Math.floor(Math.random()*arr.length)];
const shuffle = arr => {for(let i=arr.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;};
const DECK_SIZE=40,MAX_COPIES=3;
const UNIQUE_BREAD_NAMES=new Set(['Sonho de Blueberry','Sonho de Menta','Vermelhinha']);
const copyLimit=c=>UNIQUE_BREAD_NAMES.has(c.name)?1:MAX_COPIES;
function buildDeck(faction){
 const pool=window.CARD_DATA.cards.filter(c=>c.faction===faction);
 const chosen=[],counts={};
 const add=c=>{if(!c||chosen.length>=DECK_SIZE||(counts[c.id]||0)>=copyLimit(c))return false;chosen.push(c.id);counts[c.id]=(counts[c.id]||0)+1;return true;};
 const bands=[
  {cards:pool.filter(c=>c.kind==='unit'&&c.cost<=2),count:14},
  {cards:pool.filter(c=>c.kind==='unit'&&c.cost>=3&&c.cost<=4),count:12},
  {cards:pool.filter(c=>c.kind==='unit'&&c.cost>=5),count:8},
  {cards:pool.filter(c=>c.kind==='spell'),count:6}
 ];
 for(const band of bands){
  let n=0,attempts=0;
  const candidates=shuffle([...band.cards]);
  while(n<band.count&&attempts++<250&&candidates.length){
   const options=candidates.filter(c=>(counts[c.id]||0)<copyLimit(c));
   if(!options.length)break;
   if(add(rand(options)))n++;
  }
 }
 // Fallback for card pools with too few unique spells or expensive units.
 let tries=0;
 while(chosen.length<DECK_SIZE&&tries++<500){
  const available=pool.filter(c=>(counts[c.id]||0)<copyLimit(c));
  if(!available.length)break;
  const c=rand(available);
  add(c);
 }
 return shuffle(chosen);
}
function boot(){const data=window.CARD_DATA;allCards=Object.fromEntries(data.cards.map(c=>[c.id,c]));window.deckData=data.decks;if(window.TCGMenu)window.TCGMenu.show();else startGame();}
function startGame(){
 if(typeof hideInspect==='function')hideInspect();
 const match=window.TCGMenu?.match||{player:'bread',enemy:'alien'};
 const playerFaction=match.player||'bread',enemyFaction=match.enemy||'alien';
 state={turn:1,active:'player',over:false,players:{player:{health:30,maxMana:0,mana:0,deck:buildDeck(playerFaction),graveyard:[],hand:[],board:[],fatigue:0},enemy:{health:30,maxMana:0,mana:0,deck:buildDeck(enemyFaction),graveyard:[],hand:[],board:[],fatigue:0}},logs:[],lastAction:''};
 selectedCard=null;selectedAttacker=null;targetMode=null;aiBusy=false;
 for(let i=0;i<3;i++) draw('player'); for(let i=0;i<4;i++) draw('enemy');
 state.players.player.maxMana=1;state.players.player.mana=1;state.players.player.board=[];state.players.enemy.board=[];
 log('O duelo começou! '+(window.TCGMenu?.name(playerFaction)||playerFaction)+' contra '+(window.TCGMenu?.name(enemyFaction)||enemyFaction)+'.');
 window.TCGMenu?.applyBattle();setStatus('Sua vez. Jogue uma carta ou examine o campo.'); render();
}
function p(side=state.active){return state.players[side]}
function draw(side){const pl=p(side);if(pl.deck.length){const id=pl.deck.pop();if(pl.hand.length<10)pl.hand.push(id);else log((side==='player'?'Sua mão':'A mão do adversário')+' está cheia: '+allCards[id].name+' foi descartada.');}else{pl.fatigue++;pl.health-=pl.fatigue;log((side==='player'?'Você':rivalName())+' sofre '+pl.fatigue+' de dano por fadiga.');if(pl.health<=0) checkEnd();}}
function log(msg){if(!state.logs)state.logs=[];state.logs.unshift(msg);state.logs=state.logs.slice(0,35);const el=$('log');el.innerHTML=state.logs.map(x=>`<div class="log-entry">${escapeHtml(x)}</div>`).join('');}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setStatus(s){$('status').textContent=s;}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1800);}
function render(){
 if(!state.players)return;
 $('player-health').textContent=Math.max(0,p('player').health);$('enemy-health').textContent=Math.max(0,p('enemy').health);
 for(const side of ['player','enemy']){const hp=Math.max(0,p(side).health);const bar=$(side+'-health-fill');if(bar)bar.style.width=Math.max(0,Math.min(100,hp/30*100))+'%';const label=$(side+'-health-label');if(label)label.textContent=hp+' / 30';}
 $('player-mana').textContent=`${p('player').mana} / ${p('player').maxMana} MANA`;$('enemy-mana').textContent=`${p('enemy').mana} / ${p('enemy').maxMana} MANA`;
 $('mana-text').textContent=`${p('player').mana} / ${p('player').maxMana}`;$('hand-count').textContent=`${p('player').hand.length} cartas`;
 $('deck-count').textContent=`DECKS ${p('player').deck.length} / ${p('enemy').deck.length}`;
 for(const side of ['player','enemy']){const count=$(side+'-deck-number');if(count)count.textContent=p(side).deck.length+' / '+DECK_SIZE;}
 $('enemy-deck-visual')?.replaceChildren(...Array.from({length:Math.min(5,p('enemy').hand.length)},()=>{const el=document.createElement('div');el.className='enemy-card-back';el.textContent='✦';el.title='Carta oculta na mão do adversário';return el;}));
 $('enemy-hand-number')?.replaceChildren(document.createTextNode(p('enemy').hand.length+' CARTAS NA MÃO'));
 $('player-board-count').textContent=`${p('player').board.length} / 7`;$('enemy-board-count').textContent=`${p('enemy').board.length} / 7`;
 if($('turn-label'))$('turn-label').textContent=state.active==='player'?'SEU TURNO':'TURNO DE '+rivalName().toUpperCase();
 $('round-label').textContent=`TURNO ${state.turn.toString().padStart(2,'0')}`;
 $('end-turn').disabled=state.active!=='player'||state.over||aiBusy;
 $('end-turn').style.opacity=state.active==='player'&&!state.over&&!aiBusy?'1':'.45';
 const gems=$('mana-gems');gems.innerHTML='';for(let i=0;i<p('player').maxMana;i++){const g=document.createElement('i');g.className='gem'+(i<p('player').mana?' full':'');g.classList.add('gem');gems.appendChild(g);}
 renderHand();renderBoard('player');renderBoard('enemy');
 $('action-title').textContent=targetMode?'Escolha um alvo':selectedAttacker!==null?'Escolha o alvo do ataque':'Sua vez de agir';
 $('action-help').textContent=targetMode==='chargebuff'?'Escolha um Pão para receber Investida.':targetMode==='poisonbuff'?'Escolha um Pão para receber Toque Venenoso.':targetMode==='buff'?'Selecione uma criatura aliada.':targetMode==='shield'?'Selecione um aliado para receber Provocar.':targetMode==='damage'?'Selecione uma criatura inimiga para receber 3 de dano.':selectedAttacker!==null?'Clique ou arraste até uma criatura inimiga ou o herói adversário.':'Jogue cartas, ataque e encerre o turno.';
 $('ai-thought').textContent=state.active==='enemy'?'“Calculando probabilidades de vitória...”':state.lastAction||'“Analisando formas de vida...”';
}
let inspectTimer=null,inspectSource=null;
function hideInspect(){
 clearTimeout(inspectTimer);inspectTimer=null;inspectSource=null;
 const preview=$('card-inspect');if(preview){preview.classList.remove('inspect-visible');preview.innerHTML='<div class="inspect-placeholder">Passe o cursor sobre uma carta por 2 segundos para conhecer seus atributos.</div>';}
}
function inspectCard(c,u,source){
 clearTimeout(inspectTimer);
 const preview=$('card-inspect');
 if(!preview||!c)return;
 inspectSource=source||null;
 preview.classList.remove('inspect-visible');
 inspectTimer=setTimeout(()=>{
  if(source&&!source.isConnected)return;
  preview.innerHTML='';
  const img=document.createElement('img');img.src=c.art;img.alt=c.name;
  const name=document.createElement('strong');name.textContent=c.name;
  const desc=document.createElement('p');desc.textContent=c.description||'Sem efeito especial.';
  const stats=document.createElement('small');stats.textContent=c.cost+' MANA · '+(c.kind==='spell'?'FEITIÇO':(u?u.attack:c.attack)+' ATQ / '+(u?u.health:c.health)+' VIDA');
  const trait=document.createElement('em');
  const traits={chargebuff:'CONCEDE INVESTIDA',guard:'PROVOCAR',poison:'TOQUE VENENOSO',rush:'INVESTIDA',charge:'ATAQUE IMEDIATO',twin:'CÓPIA AO INVOCAR',draw:'COMPRA DE CARTA',revive:'RESSURREIÇÃO',shield:'ESCUDO'};
  const label=(u?.poison?'TOQUE VENENOSO':u?.taunt?'PROVOCAR':traits[c.ability])||'';
  trait.textContent=label;trait.hidden=!label;
  preview.append(img,name,stats,trait,desc);
  preview.classList.add('inspect-visible');
 },2000);
}
function renderHand(){
 const hand=$('hand');hand.innerHTML='';
 p('player').hand.forEach((id,i)=>{const c=allCards[id];if(!c)return;const el=document.createElement('div');el.className='card'+(c.cost>p('player').mana||p('player').board.length>=7&&c.kind==='unit'?' disabled':'')+(selectedCard===i?' selected':'');el.removeAttribute('title');el.innerHTML=`<img src="${c.art}" alt=""><span class="card-cost">${c.cost}</span><span class="kind-mark">${c.kind==='spell'?'FEITIÇO':'CRIATURA'}</span><span class="card-name">${escapeHtml(c.name)}</span>${c.kind==='unit'?`<span class="card-stats"><b class="atk">⚔ ${c.attack}</b><b class="hp">♥ ${c.health}</b></span>`:'<span class="spell-mark">✦ EFEITO ✦</span>'}`;el.onclick=()=>playCard(i);el.addEventListener('pointerenter',()=>inspectCard(c,null,el));el.addEventListener('pointerleave',hideInspect);el.addEventListener('focus',()=>inspectCard(c,null,el));el.addEventListener('blur',hideInspect);hand.appendChild(el);});
}
function renderBoard(side){
 const board=$(side==='player'?'player-board':'enemy-board');board.innerHTML='';const units=p(side).board;
 if(!units.length){board.innerHTML='<span class="empty-board">— CAMPO LIVRE —</span>';return;}
 units.forEach((u,i)=>{const c=allCards[u.id];const el=document.createElement('div');const canAttack=side==='player'&&state.active==='player'&&u.ready&&!state.over;el.className='minion'+(canAttack?' ready':'')+(selectedAttacker===i?' selected':'')+(isTargetable(side,i)?' targetable':'');el.innerHTML=`<img src="${c.art}" alt=""><span class="cost">${c.cost}</span><span class="minion-name">${escapeHtml(c.name)}</span><span class="stat">${u.attack}</span><span class="stat hp">${u.health}</span>${u.taunt?'<span class="taunt">PROVOCAR</span>':''}${u.poison?'<span class="taunt">VENENO</span>':''}${u.rushOnly?'<span class="taunt">INVESTIDA</span>':''}`;el.removeAttribute('title');el.onclick=()=>clickMinion(side,i);el.addEventListener('pointerenter',()=>inspectCard(c,u,el));el.addEventListener('pointerleave',hideInspect);board.appendChild(el);});
}
function isTargetable(side,i){if(['buff','shield','poisonbuff','chargebuff'].includes(targetMode))return side==='player';if(targetMode==='damage')return side==='enemy';if(selectedAttacker!==null)return side==='enemy'&&(!p('enemy').board.some(u=>u.taunt)||p('enemy').board[i].taunt);return false;}
function playCard(i){
 if(state.over||state.active!=='player'||aiBusy||window.TCGMotion?.busy)return;const id=p('player').hand[i],c=allCards[id];if(!c)return;if(c.cost>p('player').mana){toast('Mana insuficiente!');return;}
 if(c.cost>p('player').mana){toast('Mana insuficiente!');return;}
 if(c.kind==='unit'&&p('player').board.length>=7){toast('Seu campo já tem 7 criaturas.');return;}
 if(c.ability==='revive'&&!p('player').graveyard.length){toast('Nenhum Pão derrotado para recuperar.');return;}
 if(c.kind==='spell'&&['buff','shield','damage','poisonbuff','chargebuff'].includes(c.ability)){
  const ownTarget=['buff','shield','poisonbuff','chargebuff'].includes(c.ability);
  if(!(ownTarget?p('player').board.length:p('enemy').board.length)){toast(ownTarget?'Você precisa ter um Pão no campo para usar este feitiço.':'Você precisa de um alvo inimigo para usar este feitiço.');return;}
  selectedCard=i;targetMode=c.ability;selectedAttacker=null;setStatus('Escolha o alvo destacado no campo.');render();return;}
 p('player').mana-=c.cost;p('player').hand.splice(i,1);
 if(c.kind==='unit'){const u=makeUnit(c);p('player').board.push(u);log(`Você invocou ${c.name} (${u.attack}/${u.health}).`);triggerBattlecry('player',u,c);}
 else{resolveSpell('player',c,null);log(`Você lançou ${c.name}: ${c.description}`);}
 selectedCard=null;targetMode=null;render();checkEnd();
}
function clickMinion(side,i){
 if(state.over||state.active!=='player'||aiBusy||window.TCGMotion?.busy)return;
 if(targetMode){const c=allCards[p('player').hand[selectedCard]];if(!c)return;
   if(['buff','shield','poisonbuff','chargebuff'].includes(targetMode)&&side==='player'){p('player').mana-=c.cost;p('player').hand.splice(selectedCard,1);const u=p('player').board[i];if(targetMode==='buff'){u.attack+=2;u.health+=2;u.maxHealth+=2;log(`${c.name} fortaleceu ${allCards[u.id].name} em +2/+2.`);}else if(targetMode==='poisonbuff'){u.poison=true;log(c.name+' concedeu Toque Venenoso a '+allCards[u.id].name+'.');}else if(targetMode==='chargebuff'){u.ready=true;u.rushOnly=true;log(c.name+' concedeu Investida a '+allCards[u.id].name+'.');}else{u.taunt=true;u.health+=3;u.maxHealth+=3;log(`${c.name} protegeu ${allCards[u.id].name} com +3 de vida e Provocar.`);}targetMode=null;selectedCard=null;render();return;}
   if(targetMode==='damage'&&side==='enemy'){p('player').mana-=c.cost;p('player').hand.splice(selectedCard,1);damageMinion('enemy',i,3);log(`${c.name} causou 3 de dano a ${allCards[p('enemy').board[i]?.id||'alien1']?.name||'uma criatura'}.`);targetMode=null;selectedCard=null;cleanup('enemy');render();checkEnd();return;}
 }
 if(selectedAttacker!==null){if(side==='enemy'){if(p('enemy').board.some(u=>u.taunt)&&!p('enemy').board[i].taunt){toast('PROVOCAR: ataque primeiro a criatura com Provocar!');return;}const attacker=selectedAttacker;selectedAttacker=null;attackMinion(attacker,i);render();return;} }
 if(side==='player'){const u=p('player').board[i];if(u.ready){selectedAttacker=i;selectedCard=null;targetMode=null;setStatus('Escolha um alvo inimigo.');render();}else toast('Essa criatura ainda não pode atacar neste turno.');}
}
function makeUnit(c){return {id:c.id,attack:c.attack,health:c.health,maxHealth:c.health,ready:['rush','charge'].includes(c.ability),rushOnly:c.ability==='rush',taunt:c.ability==='guard',poison:c.ability==='poison'};}
function giveCard(side,id){const own=p(side);if(!allCards[id])return;if(own.hand.length<10){own.hand.push(id);log((side==='player'?'Você':rivalName())+' recebeu '+allCards[id].name+' na mão.');}else log('Mão cheia: '+allCards[id].name+' foi descartada.');}
function applyPoison(attacker,defender,damage){if(attacker?.poison&&damage>0&&defender)defender.health=0;}
function triggerBattlecry(side,u,c){
 const own=p(side),foe=p(side==='player'?'enemy':'player');
 switch(c.ability){case'heal':{const healed=Math.min(2,30-own.health);own.health+=healed;if(healed)log(c.name+' restaurou '+healed+' de vida ao '+(side==='enemy'?rivalName():'seu herói')+'.');break;}case'healall':own.health=Math.min(30,own.health+3);own.board.forEach(x=>{x.health=Math.min(x.maxHealth,x.health+3)});break;case'healminion':{const hurt=own.board.filter(x=>x!==u&&x.health<x.maxHealth);if(hurt.length){const t=hurt.sort((a,b)=>(a.health/a.maxHealth)-(b.health/b.maxHealth))[0];t.health=Math.min(t.maxHealth,t.health+2);}else{own.health=Math.min(30,own.health+2);log(c.name+' restaurou 2 de vida do herói de '+rivalName()+'.');}break;}case'draw':draw(side);break;case'chainMenta':giveCard(side,window.CARD_DATA.cards.find(x=>x.name==='Sonho de Menta')?.id);break;case'chainVermelhinha':giveCard(side,window.CARD_DATA.cards.find(x=>x.name==='Vermelhinha')?.id);break;case'twin':if(own.board.length<7){const clone=makeUnit(c);clone.ready=false;own.board.push(clone);log(c.name+' invocou uma cópia!');}break;case'teamBuff':own.board.forEach(x=>{x.attack++;x.health++;x.maxHealth++;});log(c.name+' fortaleceu todos os Pães em campo com +1/+1!');break;case'ping':if(c.id==='bread12'){foe.health-=1;}else if(foe.board.length){const t=foe.board.slice().sort((a,b)=>a.health-b.health)[0];damageMinion(side==='player'?'enemy':'player',foe.board.indexOf(t),1);cleanup(side==='player'?'enemy':'player');}else foe.health-=1;break;}
}
function resolveSpell(side,c,target){
 const own=p(side),foe=p(side==='player'?'enemy':'player');
 switch(c.ability){
 case'heal':own.health=Math.min(30,own.health+3);toast('Seu herói recuperou 3 de vida.');break;
 case'draw2':draw(side);draw(side);break;
 case'revive':{const available=own.graveyard.filter(id=>allCards[id]?.kind==='unit');if(available.length){const id=rand(available);own.graveyard.splice(own.graveyard.indexOf(id),1);giveCard(side,id);}else log('Mãos de Padeiro: nenhum Pão derrotado para recuperar.');break;}
 case'teamBuff':own.board.forEach(u=>{u.attack++;u.health++;u.maxHealth++;});break;
 case'damage':if(target!==null)damageMinion(side==='player'?'enemy':'player',target,3);break;
 case'damageall':foe.board.forEach(u=>u.health-=2);cleanup(side==='player'?'enemy':'player');break;
 case'buff':case'shield':case'poisonbuff':case'chargebuff':break;
 }
}
function damageMinion(side,i,n){const u=p(side).board[i];if(!u)return;u.health-=n;if(u.health<=0){log(`${allCards[u.id].name} foi derrotado.`);p(side).graveyard.push(u.id);p(side).board.splice(i,1);}else log(`${allCards[u.id].name} recebeu ${n} de dano.`);}
function cleanup(side){const own=p(side);own.board.filter(u=>u.health<=0).forEach(u=>{own.graveyard.push(u.id);log(allCards[u.id].name+' foi derrotado.');});own.board=own.board.filter(u=>u.health>0);}
function attackMinion(ai,ei){if(p('enemy').board.some(u=>u.taunt)&&!p('enemy').board[ei]?.taunt){toast('PROVOCAR: ataque a criatura que protege o campo!');return;}const atk=p('player').board[ai],def=p('enemy').board[ei];if(!atk||!def||!atk.ready)return;const attack=atk.attack;def.health-=attack;atk.health-=def.attack;applyPoison(atk,def,attack);applyPoison(def,atk,def.attack);atk.ready=false;log(`${allCards[atk.id].name} (${attack}) atacou ${allCards[def.id].name} (${def.attack}).`);if(def.health<=0)log(`${allCards[def.id].name} foi derrotado.`);if(atk.health<=0)log(`${allCards[atk.id].name} foi derrotado.`);cleanup('player');cleanup('enemy');}
function attackHero(i){const u=p('player').board[i];if(!u||!u.ready||u.rushOnly)return;if(p('enemy').board.some(x=>x.taunt)){toast('Você precisa atacar uma criatura com Provocar.');return;}p('enemy').health-=u.attack;u.ready=false;log(`${allCards[u.id].name} atacou o herói adversário e causou ${u.attack} de dano.`);selectedAttacker=null;render();checkEnd();}
function clickHero(side){if(side==='enemy'&&selectedAttacker!==null){if(p('enemy').board.some(u=>u.taunt)){toast('PROVOCAR: elimine as criaturas com Provocar antes do ataque direto.');return;}attackHero(selectedAttacker);return;}if(targetMode)toast('Essa carta precisa de um alvo no campo.');}
$('player-hero').onclick=()=>clickHero('player');$('enemy-hero').onclick=()=>clickHero('enemy');
function endTurn(){if(state.over||state.active!=='player'||aiBusy||window.TCGMotion?.busy)return;selectedCard=null;selectedAttacker=null;targetMode=null;state.active='enemy';setStatus(rivalName()+' está calculando suas jogadas...');render();setTimeout(aiTurn,500);}
$('end-turn').onclick=endTurn;
function beginTurn(side){const pl=p(side);pl.maxMana=Math.min(10,pl.maxMana+1);pl.mana=pl.maxMana;draw(side);pl.board.forEach(u=>{u.ready=true;u.rushOnly=false;});}
function aiTurn(){
 if(state.over)return;aiBusy=true;beginTurn('enemy');render();let safety=0;
 async function step(){
  if(state.over){aiBusy=false;return;}
  const choice=chooseAIAction();if(choice&&safety++<18){if(window.TCGMotion)await window.TCGMotion.aiAction(choice);else{executeAI(choice);render();}await new Promise(r=>setTimeout(r,700));return step();}
  aiBusy=false;state.active='player';state.turn++;beginTurn('player');setStatus('Seu turno! A mana foi recarregada e você comprou uma carta.');state.lastAction='“Os pães ainda estão de pé. Incrível...”';log(rivalName()+' encerrou o turno. Sua vez!');render();checkEnd();window.TCGMotion?.banner('SEU TURNO','PREPARE O ESQUADRÃO');
 }
 window.TCGMotion?.banner('TURNO DO ADVERSÁRIO',rivalName().toUpperCase()+' VAI AGIR');setTimeout(()=>step().catch(console.error),3200);
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
 if(!taunts.length&&attackers.filter(x=>!x.u.rushOnly).reduce((n,x)=>n+x.u.attack,0)>=foe.health&&attackers.some(x=>!x.u.rushOnly))return {type:'face',i:attackers.find(x=>!x.u.rushOnly).i};
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
   if(['heal','healall'].includes(c.ability)&&me.health<=24)score+=Math.min(16,(30-me.health)*1.5);
   if(c.ability==='twin'&&me.board.length<=5)score+=5;
   if(c.ability==='chainMenta'||c.ability==='chainVermelhinha')score+=me.hand.length<=7?4:0;
   if(c.ability==='poison'&&foe.board.some(u=>u.health>=4))score+=5;
   if(['charge','rush'].includes(c.ability)&&foe.board.length)score+=3;
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
   if(c.ability==='chargebuff'&&me.board.some(u=>!u.ready)){const target=me.board.findIndex(u=>!u.ready);actions.push({type:'spell',i,target,score:5+(foe.board.length?4:0)});}
   if(c.ability==='poisonbuff'&&me.board.some(u=>!u.poison)){const target=me.board.findIndex(u=>!u.poison);actions.push({type:'spell',i,target,score:4+(foe.board.length?4:0)});}
   if(c.ability==='draw2'&&me.hand.length<=6&&me.deck.length>=2)actions.push({type:'spell',i,score:6});
   if(c.ability==='revive'&&me.graveyard.length&&me.hand.length<8)actions.push({type:'spell',i,score:6});
   if(c.ability==='teamBuff'&&me.board.length>=2)actions.push({type:'spell',i,score:me.board.length*2.8});
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
 if(!taunts.length&&attackers.some(x=>!x.u.rushOnly))return {type:'face',i:attackers.find(x=>!x.u.rushOnly).i};
 if(bestTrade&&taunts.length)return {type:'attack',i:bestTrade.i,target:bestTrade.target};
 brain.phase='pass';return null;
}
function executeAI(a){const me=p('enemy'),foe=p('player');
 if(a.type==='unit'){const id=me.hand.splice(a.i,1)[0],c=allCards[id];me.mana-=c.cost;const u=makeUnit(c);me.board.push(u);triggerBattlecry('enemy',u,c);log(`${rivalName()} invocou ${c.name} (${u.attack}/${u.health}).`);state.lastAction='“'+aiBrain.style.name+': consolidando a estratégia.”';}
 if(a.type==='spell'){const id=me.hand[a.i],c=allCards[id];me.hand.splice(a.i,1);me.mana-=c.cost;if(c.ability==='damage'&&a.target!==undefined){damageMinion('player',a.target,3);}else if(c.ability==='buff'||c.ability==='shield'||c.ability==='poisonbuff'||c.ability==='chargebuff'){const u=me.board[a.target]||me.board[0];if(u){if(c.ability==='buff'){u.attack+=2;u.health+=2;u.maxHealth+=2;}else if(c.ability==='poisonbuff'){u.poison=true;}else if(c.ability==='chargebuff'){u.ready=true;u.rushOnly=true;}else{u.taunt=true;u.health+=3;u.maxHealth+=3;}}}else resolveSpell('enemy',c,null);log(`${rivalName()} usou ${c.name}.`);state.lastAction='“Recursos utilizados com eficiência.”';}
 if(a.type==='attack'){const at=me.board[a.i],de=foe.board[a.target];if(at&&at.ready&&de&&(!foe.board.some(u=>u.taunt)||de.taunt)){de.health-=at.attack;at.health-=de.attack;applyPoison(at,de,at.attack);applyPoison(de,at,de.attack);at.ready=false;log(`${allCards[at.id].name} de ${rivalName()} atacou ${allCards[de.id].name}.`);cleanup('player');cleanup('enemy');}}
 if(a.type==='face'){const at=me.board[a.i];if(at&&at.ready&&!at.rushOnly&&!foe.board.some(u=>u.taunt)){foe.health-=at.attack;at.ready=false;log(`${rivalName()} atacou seu herói com ${allCards[at.id].name}, causando ${at.attack} de dano.`);}}
 checkEnd();
}
function checkEnd(){if(state.over)return;if(p('player').health<=0||p('enemy').health<=0){state.over=true;const win=p('enemy').health<=0; $('modal-symbol').textContent=win?'🏆':'👽';$('modal-title').textContent=win?'VITÓRIA!':'DERROTA!';$('modal-text').textContent=win?'Você venceu o duelo contra '+(window.TCGMenu?.name(window.TCGMenu?.match.enemy)||'a CPU')+'!':'A CPU venceu o duelo. Experimente outra estratégia ou um novo confronto.';$('modal').classList.remove('hidden');render();}}
$('restart').onclick=startGame;$('modal-restart').onclick=()=>{$('modal').classList.add('hidden');startGame();};
$('log-toggle').onclick=()=>$('log').classList.toggle('open');
try { boot(); } catch(e) { console.error(e); document.body.innerHTML='<div style="padding:30px;color:white">Não foi possível iniciar o jogo. Verifique cards-data.js e o console do navegador.</div>'; }
