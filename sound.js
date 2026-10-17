/* Centralized browser audio. A missing/unsupported file never interrupts gameplay. */
(function(){
 'use strict';
 const sources={
  hover:'assets/sounds/card_hover.mp3',
  summon:'assets/sounds/card_summon.mp3',
  attack:'assets/sounds/card_attack.wav',
  spell:'assets/sounds/card_feitico.wav',
  guard:'assets/sounds/card_provocar.wav',
  notification:'assets/sounds/notification.wav'
 };
 const pools={},last={};let volume=.4, musicVolume=.25,unlocked=false;
 const music=new Audio('assets/battle_theme.mp3');music.loop=true;music.preload='none';music.volume=musicVolume;
 music.addEventListener('error',()=>console.warn('Trilha sonora indisponível: assets/battle_theme.mp3'));
 try{const saved=localStorage.getItem('tcg-music-volume');if(saved!==null&&Number.isFinite(+saved))musicVolume=Math.min(1,Math.max(0,+saved));}catch(_){}
 music.volume=musicVolume;
 try{const saved=localStorage.getItem('tcg-volume');if(saved!==null&&Number.isFinite(+saved))volume=Math.min(1,Math.max(0,+saved));}catch(_){}
 for(const [key,url] of Object.entries(sources)){
  pools[key]=Array.from({length:key==='hover'?3:4},()=>{
   const audio=new Audio(url);audio.preload='auto';audio.volume=volume;
   audio.addEventListener('error',()=>{if(!audio.dataset.warned){audio.dataset.warned='1';console.warn('Áudio indisponível:',url);}});
   return audio;
  });
 }
 function setVolume(v){volume=Math.min(1,Math.max(0,Number(v)||0));for(const pool of Object.values(pools))for(const a of pool)a.volume=volume;try{localStorage.setItem('tcg-volume',String(volume));}catch(_){}return volume;}
 function play(key,interval=0){
  if(!unlocked||volume<=0||!pools[key])return;
  const now=performance.now();if(interval&&now-(last[key]||-Infinity)<interval)return;last[key]=now;
  const pool=pools[key];const audio=pool.find(a=>a.paused||a.ended)||pool[0];
  try{audio.pause();audio.currentTime=0;audio.volume=volume;const promise=audio.play();promise?.catch(()=>{});}catch(_){}
 }
 function setMusicVolume(v){musicVolume=Math.min(1,Math.max(0,Number(v)||0));music.volume=musicVolume;try{localStorage.setItem('tcg-music-volume',String(musicVolume));}catch(_){}return musicVolume;}
 function startMusic(){if(!unlocked)return;try{const promise=music.play();promise?.catch(()=>{});}catch(_){}}
 function stopMusic(){music.pause();try{music.currentTime=0;}catch(_){}}
 function unlock(){unlocked=true;}
 document.addEventListener('pointerdown',unlock,{capture:true});
 document.addEventListener('keydown',unlock,{capture:true});
 // Delegation survives full DOM re-renders. pointerover only fires when entering a different card.
 let hoverCard=null;
 document.addEventListener('pointerover',e=>{
  const card=e.target.closest?.('#hand .card,#player-board .minion,#enemy-board .minion');
  if(!card||card===hoverCard)return;
  hoverCard=card;play('hover',65);
 });
 document.addEventListener('pointerout',e=>{
  const card=e.target.closest?.('#hand .card,#player-board .minion,#enemy-board .minion');
  if(card&&!card.contains(e.relatedTarget)&&hoverCard===card)hoverCard=null;
 });
 window.TCGAudio={play,setVolume,getVolume:()=>volume,setMusicVolume,getMusicVolume:()=>musicVolume,startMusic,stopMusic,unlock};
})();
