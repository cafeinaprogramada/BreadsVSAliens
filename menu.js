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

 const COMIC='https://fliptru.com.br/comic/breads-on-fire';
 const lessons=[
  {icon:'🎯',title:'Objetivo da batalha',tag:'COMECE AQUI',intro:'Dois comandantes, dois baralhos e uma batalha por turnos.',items:[['❤️','Proteja seu herói','Você começa com 30 pontos de vida. Vença reduzindo a vida do herói adversário a zero.'],['🥖','Escolha sua facção','Escolha Pães, Aliens ou Humanos para você e depois escolha quem a CPU controlará.'],['🃏','Conheça o baralho','Cada participante recebe um baralho de 40 cartas. Você começa com 3 cartas na mão; a CPU começa com 4.']]},
  {icon:'🗺️',title:'Conheça a arena',tag:'ONDE ESTÁ CADA COISA',intro:'A tela mostra tudo de que você precisa para planejar suas jogadas.',items:[['👽','Campo de cima','É onde ficam o herói e as criaturas do adversário.'],['🥖','Campo de baixo','É onde aparecem suas criaturas. Abaixo delas está sua mão de cartas.'],['🔎','Inspeção de cartas','Passe o cursor sobre uma carta e aguarde cerca de 2 segundos para ver sua arte, custo, atributos e habilidade.'],['📜','Informações da partida','Veja a mana, o número de cartas no baralho, as notificações e o registro de combate.']]},
  {icon:'💎',title:'Mana e cartas',tag:'SEUS RECURSOS',intro:'Cada jogada tem um custo. Planeje antes de gastar.',items:[['💎','O que é mana?','É o recurso usado para jogar cartas. O número no canto da carta mostra quanta mana ela custa.'],['📈','Mais mana a cada turno','Você começa com 1 mana. A cada novo turno seu, sua capacidade aumenta em 1, até o máximo de 10, e sua mana é recarregada.'],['🃏','Criaturas e feitiços','Criaturas entram no seu campo para lutar. Feitiços causam efeitos especiais, como comprar cartas, fortalecer aliados ou atingir inimigos.'],['⚠️','Limites do campo','Você pode ter até 7 criaturas no campo e até 10 cartas na mão.']]},
  {icon:'🖱️',title:'Como jogar cartas',tag:'CLIQUE OU ARRASTE',intro:'Você pode jogar usando cliques ou arrastando as cartas.',items:[['👆','Clique para invocar','Clique em uma criatura da sua mão. Se tiver mana suficiente e espaço no campo, ela será invocada.'],['🫳','Arraste para jogar','Arraste uma carta da mão até a área de batalha e solte para jogá-la.'],['✨','Feitiços com alvo','Alguns feitiços pedem que você escolha uma criatura aliada ou inimiga. Depois de selecionar o feitiço, clique no alvo destacado.'],['🚫','Carta indisponível','Se faltar mana ou seu campo estiver cheio, você não poderá jogar aquela criatura.']]},
  {icon:'⚔️',title:'Ataques e combate',tag:'DERROTE O ADVERSÁRIO',intro:'Suas criaturas atacam as unidades inimigas ou o herói rival.',items:[['⚔️','Ataque e vida','Ataque indica quanto dano a criatura causa; vida indica quanto dano ela ainda suporta.'],['🎯','Atacar com clique','Clique em uma criatura sua que esteja pronta para atacar e depois clique na criatura inimiga ou no herói adversário.'],['🫳','Atacar arrastando','Arraste uma criatura sua até a criatura inimiga ou o herói adversário e solte.'],['💥','Dano de resposta','Quando duas criaturas lutam, normalmente ambas recebem o ataque uma da outra. Criaturas com vida zero são derrotadas.'],['⏳','Aguarde o momento certo','Criaturas comuns geralmente precisam esperar até o próximo turno para atacar. Habilidades especiais podem permitir ataques imediatos.']]},
  {icon:'🛡️',title:'Habilidades especiais',tag:'SURPRESAS DAS CARTAS',intro:'Leia a descrição de cada carta: algumas mudam as regras de um confronto.',items:[['🛡️','Provocar','Enquanto houver uma criatura inimiga com Provocar, você precisa atacá-la antes de atingir outras criaturas ou o herói.'],['⚡','Investida e ataque imediato','Algumas criaturas podem agir assim que são invocadas. Investida pode restringir o ataque a criaturas naquele turno.'],['☠️','Veneno','Um ataque com veneno pode derrotar a criatura atingida independentemente da vida restante.'],['🔁','Ataque duplo','Algumas criaturas conseguem atacar duas vezes por turno.'],['✨','Outras habilidades','Há cartas que curam, compram cartas, invocam aliados ou fortalecem seu exército.']]},
  {icon:'🏆',title:'Turnos e vitória',tag:'PRONTO PARA JOGAR',intro:'Agora você já conhece o básico. É hora de comandar seu baralho!',items:[['➡️','Encerrar turno','Quando terminar suas ações, clique em ENCERRAR TURNO. A CPU fará as jogadas dela.'],['🃏','Próxima rodada','Quando chegar sua vez novamente, você compra uma carta e recupera sua mana.'],['❤️','Como vencer','Reduza a vida do herói adversário a zero antes que ele faça o mesmo com você.'],['🔄','Jogue novamente','Após a vitória ou derrota, você pode reiniciar a batalha ou voltar ao menu principal.']]}
 ];
 let tutorialPage=0;
 function openComic(){window.open(COMIC,'_blank','noopener,noreferrer');}
 function settingsMarkup(){
  return '<div class="menu-stars"></div><section class="menu-dialog-screen" aria-label="Configurações de áudio"><div class="menu-dialog-kicker">⚙ PREFERÊNCIAS</div><h2>CONFIGURAÇÕES</h2><p class="menu-dialog-intro">Ajuste os efeitos e a música de batalha separadamente.</p><div class="menu-audio-panel"><label for="menu-volume-slider">🔊 EFEITOS SONOROS <output id="menu-volume-value">40%</output></label><input id="menu-volume-slider" type="range" min="0" max="100" step="5" value="40"><small>Cartas, ataques, feitiços e notificações.</small><label for="menu-music-slider">🎵 TRILHA DE BATALHA <output id="menu-music-value">25%</output></label><input id="menu-music-slider" type="range" min="0" max="100" step="5" value="25"><small>A música começa quando a batalha inicia e se repete durante o duelo.</small></div><button class="menu-secondary menu-dialog-back" id="menu-back">← VOLTAR AO MENU</button></section>';
 }
 function tutorialMarkup(){
  const lesson=lessons[tutorialPage];
  return '<div class="menu-stars"></div><section class="menu-dialog-screen menu-tutorial-screen" aria-label="Tutorial de como jogar"><div class="menu-dialog-kicker">📖 GUIA DO COMANDANTE</div><div class="menu-tutorial-top"><h2>COMO JOGAR</h2><span class="menu-page-count">'+(tutorialPage+1)+' / '+lessons.length+'</span></div><div class="menu-lesson"><div class="menu-lesson-heading"><span class="menu-lesson-icon">'+lesson.icon+'</span><div><small>'+lesson.tag+'</small><h3>'+lesson.title+'</h3></div></div><p>'+lesson.intro+'</p><div class="menu-lesson-items">'+lesson.items.map(item=>'<div class="menu-lesson-item"><span aria-hidden="true">'+item[0]+'</span><div><strong>'+item[1]+'</strong><p>'+item[2]+'</p></div></div>').join('')+'</div></div><div class="menu-tutorial-pagination"><button class="menu-secondary" id="tutorial-prev" '+(tutorialPage===0?'disabled':'')+'>← ANTERIOR</button><div class="menu-page-dots">'+lessons.map((_,i)=>'<button class="'+(i===tutorialPage?'active':'')+'" data-page="'+i+'" aria-label="Ir para página '+(i+1)+'" '+(i===tutorialPage?'aria-current="step"':'')+'></button>').join('')+'</div><button class="menu-play" id="tutorial-next">'+(tutorialPage===lessons.length-1?'CONCLUIR ✓':'PRÓXIMO →')+'</button></div><button class="menu-secondary menu-dialog-back" id="menu-back">✕ FECHAR TUTORIAL</button></section>';
 }
 function setStage(next){
  stage=next;picked=null;locked=false;
  const el=root();if(!el)return;
  el.classList.remove('menu-hidden','menu-transition');
  el.classList.toggle('menu-is-title',next==='title');
  el.classList.toggle('menu-is-dialog',next==='settings'||next==='tutorial');
  if(next==='title'){
   el.innerHTML='<div class="menu-stars"></div><section class="menu-title-screen"><div class="menu-emblem">🍞 <span>VS</span> 👽</div><p class="menu-eyebrow">UM DUELO DE OUTRO PLANETA</p><h1>PÃES <span>VS</span> ALIENS</h1><p class="menu-subtitle">O destino da padaria está nas suas mãos!</p><div class="menu-title-actions"><button class="menu-play" id="menu-play">▶ JOGAR</button><button class="menu-secondary" id="menu-tutorial">📖 COMO JOGAR</button><button class="menu-secondary" id="menu-settings">⚙ CONFIGURAÇÕES</button></div><p class="menu-credit">BREADS ON FIRE · CARD BATTLE</p></section><div class="menu-title-footer"><span>2026 © - Lucas Jefrey</span><a class="menu-comic-link" href="'+COMIC+'" target="_blank" rel="noopener noreferrer">📚 LER A HQ ↗</a></div>';
  }else if(next==='settings')el.innerHTML=settingsMarkup();
  else if(next==='tutorial')el.innerHTML=tutorialMarkup();
  else el.innerHTML='<div class="menu-stars"></div><section class="menu-select-screen"><div class="menu-step">ESCOLHA '+(next==='player'?'01 / 02':'02 / 02')+'</div><h2>'+(next==='player'?'SELECIONE SEU PERSONAGEM':'SELECIONE SEU ADVERSÁRIO')+'</h2><p>'+(next==='player'?'Cada personagem comanda seu próprio baralho.':'Quem a CPU vai controlar nesta batalha?')+'</p><div class="menu-versus-row"><span>'+(next==='player'?'VOCÊ':'CPU')+'</span><strong>VS</strong><span>'+(next==='player'?'CPU':'VOCÊ: '+name(match.player))+'</span></div><div class="menu-character-grid">'+order.map(id=>card(id,picked)).join('')+'</div><div class="menu-actions"><button id="menu-back" class="menu-secondary">← VOLTAR</button><button id="menu-confirm" class="menu-play" disabled>'+(next==='player'?'PRÓXIMO →':'⚔ INICIAR BATALHA')+'</button></div></section>';
  el.querySelector('#menu-play')?.addEventListener('click',()=>transition('player'));
  el.querySelector('#menu-settings')?.addEventListener('click',()=>transition('settings'));
  el.querySelector('#menu-tutorial')?.addEventListener('click',()=>{tutorialPage=0;transition('tutorial');});
  el.querySelector('#menu-back')?.addEventListener('click',()=>transition(['settings','tutorial','player'].includes(next)?'title':'player'));
  for(const [id,out,get,set] of [['menu-volume-slider','menu-volume-value','getVolume','setVolume'],['menu-music-slider','menu-music-value','getMusicVolume','setMusicVolume']]){
   const slider=el.querySelector('#'+id);if(!slider)continue;
   slider.value=Math.round((window.TCGAudio?.[get]?.()??(get==='getVolume'?.4:.25))*100);
   const label=el.querySelector('#'+out);label.textContent=slider.value+'%';
   slider.addEventListener('input',()=>{window.TCGAudio?.[set]?.(Number(slider.value)/100);label.textContent=slider.value+'%';});
  }
  el.querySelector('#tutorial-prev')?.addEventListener('click',()=>{if(tutorialPage>0){tutorialPage--;setStage('tutorial');}});
  el.querySelector('#tutorial-next')?.addEventListener('click',()=>{if(tutorialPage<lessons.length-1){tutorialPage++;setStage('tutorial');}else transition('title');});
  el.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{tutorialPage=Number(btn.dataset.page);setStage('tutorial');}));
  el.querySelectorAll('[data-pick]').forEach(btn=>btn.addEventListener('click',()=>{
   if(locked)return;picked=btn.dataset.pick;
   el.querySelectorAll('[data-pick]').forEach(b=>b.classList.toggle('chosen',b.dataset.pick===picked));
   el.querySelector('#menu-confirm').disabled=false;
  }));
  el.querySelector('#menu-confirm')?.addEventListener('click',()=>{
   if(!picked||locked)return;match[next]=picked;
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
   window.TCGAudio?.startMusic();
   startGame();
  },390);
 }
 window.TCGMenu={match,name,characters:CHARACTERS,show(){window.TCGAudio?.stopMusic();battle()?.classList.add('menu-battle-hidden');setStage('title');},applyBattle,open(){window.TCGAudio?.stopMusic();battle()?.classList.add('menu-battle-hidden');setStage('title');}};
})();
