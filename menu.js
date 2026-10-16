/* Character selection and future-proof faction registry. No changes to the combat AI. */
(function(){
 const CHARACTERS={
  bread:{id:'bread',name:'Tenente dos Pães',deck:'Baralho dos Pães',emoji:'🥖',side:'Resistência da Padaria',color:'#f5c765',description:'Coragem, sinergia e pão quentinho.',tag:'RESISTÊNCIA'},
  alien:{id:'alien',name:'Comandante Zork',deck:'Baralho Alienígena',emoji:'👽',side:'Invasores da Nebulosa',color:'#7be7a5',description:'Tecnologia, estratégia e invasão.',tag:'INVASÃO'},
  human:{id:'human',name:'Capitão dos Humanos',deck:'Baralho dos Humanos',emoji:'🛡️',side:'Defensores da Terra',color:'#8fc6ff',description:'Policiais, cristais, capoeira e reforços.',tag:'HUMANIDADE'}
 };
 const order=['bread','alien','human'];
 const match={player:'bread',enemy:'alien'};
 let stage='title',picked=null,locked=false;
 const root=()=>document.getElementById('menu-root');
 const battle=()=>document.querySelector('.app');
 const name=id=>CHARACTERS[id]?.name||id;
 function character(id){return CHARACTERS[id]||CHARACTERS.bread;}
 function card(id,selected){
  const c=character(id),count=(window.CARD_DATA?.cards||[]).filter(x=>x.faction===id&&!x.token).length;
  return '<button class="menu-character'+(selected===id?' chosen':'')+'" data-pick="'+id+'" style="--character-color:'+c.color+'"><span class="menu-character-icon">'+c.emoji+'</span><span class="menu-character-tag">'+c.tag+'</span><strong>'+c.name+'</strong><span class="menu-character-deck">'+c.deck+'</span><span class="menu-character-description">'+c.description+'</span><span class="menu-character-count">'+count+' tipos de carta · deck aleatório de 40</span></button>';
 }
 function setStage(next){
  stage=next;picked=null;locked=false;
  const el=root();if(!el)return;
  el.classList.remove('menu-hidden');el.classList.remove('menu-transition');
  el.innerHTML=next==='title'?
   '<div class="menu-stars"></div><section class="menu-title-screen"><div class="menu-emblem">🍞 <span>VS</span> 👽</div><p class="menu-eyebrow">UM DUELO DE OUTRO PLANETA</p><h1>PÃES <span>VS</span> ALIENS</h1><p class="menu-subtitle">O destino da padaria está nas suas mãos!</p><button class="menu-play" id="menu-play">▶ JOGAR</button><div class="menu-volume"><label for="menu-volume-slider">🔊 VOLUME DOS EFEITOS</label><div class="menu-volume-row"><input id="menu-volume-slider" type="range" min="0" max="100" step="5" value="40" aria-label="Volume dos efeitos sonoros"><output id="menu-volume-value">40%</output></div></div><p class="menu-credit">BREADS ON FIRE · CARD BATTLE</p></section>':
   '<div class="menu-stars"></div><section class="menu-select-screen"><div class="menu-step">ESCOLHA '+(next==='player'?'01 / 02':'02 / 02')+'</div><h2>'+(next==='player'?'SELECIONE SEU PERSONAGEM':'SELECIONE SEU ADVERSÁRIO')+'</h2><p>'+(next==='player'?'Cada personagem comanda seu próprio baralho.':'Quem a CPU vai controlar nesta batalha?')+'</p><div class="menu-versus-row"><span>'+(next==='player'?'VOCÊ':'CPU')+'</span><strong>VS</strong><span>'+(next==='player'?'CPU':'VOCÊ: '+name(match.player))+'</span></div><div class="menu-character-grid">'+order.map(id=>card(id,picked)).join('')+'</div><div class="menu-actions"><button id="menu-back" class="menu-secondary">← VOLTAR</button><button id="menu-confirm" class="menu-play" disabled>'+(next==='player'?'PRÓXIMO →':'⚔ INICIAR BATALHA')+'</button></div></section>';
  const volumeSlider=el.querySelector('#menu-volume-slider');
  if(volumeSlider){volumeSlider.value=Math.round((window.TCGAudio?.getVolume()??.4)*100);el.querySelector('#menu-volume-value').textContent=volumeSlider.value+'%';volumeSlider.addEventListener('input',()=>{window.TCGAudio?.setVolume(Number(volumeSlider.value)/100);el.querySelector('#menu-volume-value').textContent=volumeSlider.value+'%';});}
  el.querySelector('#menu-play')?.addEventListener('click',()=>transition('player'));
  el.querySelector('#menu-back')?.addEventListener('click',()=>transition(next==='player'?'title':'player'));
  el.querySelectorAll('[data-pick]').forEach(btn=>btn.addEventListener('click',()=>{
   if(locked)return;picked=btn.dataset.pick;
   el.querySelectorAll('[data-pick]').forEach(b=>b.classList.toggle('chosen',b.dataset.pick===picked));
   el.querySelector('#menu-confirm').disabled=false;
  }));
  el.querySelector('#menu-confirm')?.addEventListener('click',()=>{
   if(!picked||locked)return;
   match[next]=picked;
   if(next==='player')transition('enemy');else launch();
  });
 }
 function transition(next){
  if(locked)return;locked=true;root()?.classList.add('menu-transition');
  setTimeout(()=>setStage(next),360);
 }
 function applyBattle(){
  for(const side of ['player','enemy']){
   const c=character(match[side]),hero=document.querySelector('.'+side+'-hero');
   if(!hero)continue;
   const title=hero.querySelector('.hero-info b'),subtitle=hero.querySelector('.hero-info span'),portrait=hero.querySelector('.hero-portrait');
   if(title)title.textContent=(side==='player'?'VOCÊ · ':'CPU · ')+c.name.toUpperCase();
   if(subtitle)subtitle.textContent=c.side;
   if(portrait){portrait.textContent=c.emoji;portrait.classList.toggle('bread-portrait',c.id==='bread');portrait.classList.toggle('alien-portrait',c.id==='alien');portrait.classList.toggle('human-portrait',c.id==='human');}
  }
  const enemyLabel=document.querySelector('.battlefield .lane-label:not(.player-lane) span:first-child');
  const playerLabel=document.querySelector('.battlefield .player-lane span:first-child');
  if(enemyLabel)enemyLabel.textContent='ESQUADRÃO · '+character(match.enemy).deck.toUpperCase();
  if(playerLabel)playerLabel.textContent='SEU ESQUADRÃO · '+character(match.player).deck.toUpperCase();
  const enemyDeck=document.querySelector('.enemy-rail small'),playerDeck=document.querySelector('.player-rail small');
  if(enemyDeck)enemyDeck.textContent=character(match.enemy).deck.toUpperCase();
  if(playerDeck)playerDeck.textContent=character(match.player).deck.toUpperCase();
  const enemySymbol=document.querySelector('.enemy-rail .deck-symbol'),playerSymbol=document.querySelector('.player-rail .deck-symbol');
  if(enemySymbol)enemySymbol.textContent=character(match.enemy).emoji;
  if(playerSymbol)playerSymbol.textContent=character(match.player).emoji;
 }
 function launch(){
  if(locked)return;locked=true;
  root()?.classList.add('menu-transition');
  setTimeout(()=>{
   battle()?.classList.remove('menu-battle-hidden');
   root()?.classList.add('menu-hidden');
   document.getElementById('modal')?.classList.add('hidden');
   window.scrollTo?.(0,0);
   startGame();
  },390);
 }
 window.TCGMenu={match,name,characters:CHARACTERS,show(){battle()?.classList.add('menu-battle-hidden');setStage('title');},applyBattle,open(){battle()?.classList.add('menu-battle-hidden');setStage('title');}};
})();
