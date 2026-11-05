import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type Phaser from 'phaser';
import { createWorld, Journey } from './world';
import { chapters } from './story';
import { audio } from './audio';
import './style.css';
type Phase='intro'|'moving'|'typing'|'reading';
function Icon({name}:{name:'sound'|'mute'|'back'|'restart'|'expand'|'next'}){
 const paths={sound:<><path d="m4 9 4 0 5-4v14l-5-4H4z"/><path d="M16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></>,mute:<><path d="m4 9 4 0 5-4v14l-5-4H4z"/><path d="m17 9 5 6m0-6-5 6"/></>,back:<path d="m14 6-6 6 6 6M8 12h13"/>,restart:<><path d="M5 9a8 8 0 1 1 0 7M5 3v6h6"/></>,expand:<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>,next:<path d="m9 6 6 6-6 6M3 12h12"/>};
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" aria-hidden="true">{paths[name]}</svg>;
}
function App(){
 const host=useRef<HTMLDivElement>(null),game=useRef<Phaser.Game|null>(null),phaseRef=useRef<Phase>('intro'),indexRef=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [phase,setPhase]=useState<Phase>('intro'),[index,setIndex]=useState(0),[typed,setTyped]=useState(0),[ready,setReady]=useState(false),[muted,setMuted]=useState(()=>{try{return localStorage.getItem('tree-muted')==='true';}catch{return false;}}),[fullscreen,setFullscreen]=useState(false),[error,setError]=useState(false);
 const c=chapters[index];
 const changePhase=useCallback((p:Phase)=>{phaseRef.current=p;setPhase(p);},[]);
 const scene=()=>game.current?.scene.getScene('journey') as Journey|undefined;
 const stopTyping=useCallback(()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;},[]);
 const narrate=useCallback((n:number)=>{
  stopTyping();setTyped(0);indexRef.current=n;setIndex(n);changePhase('typing');let at=0;const text=chapters[n].text;
  const tick=()=>{if(phaseRef.current!=='typing')return;at++;setTyped(at);if(!/[\s.,!?:;—]/.test(text[at-1]))audio.syllable(at);if(at>=text.length){changePhase('reading');return;}const delay=/[.!?]/.test(text[at-1])?170:/[,;:]/.test(text[at-1])?70:18;timer.current=setTimeout(tick,delay);};
  timer.current=setTimeout(tick,150);
 },[changePhase,stopTyping]);
 useEffect(()=>{
  if(!host.current)return;
  try{game.current=createWorld(host.current,{ready:()=>setReady(true),arrived:narrate});}catch{setError(true);}
  return()=>{stopTyping();game.current?.destroy(true);game.current=null;};
 },[narrate,stopTyping]);
 useEffect(()=>{audio.setMuted(muted);try{localStorage.setItem('tree-muted',String(muted));}catch{}},[muted]);
 useEffect(()=>{scene()?.setTalking(phase==='typing');},[phase]);
 const next=useCallback(()=>{
  void audio.unlock();
  if(phaseRef.current==='intro'){if(ready)narrate(0);return;}
  if(phaseRef.current==='moving')return;
  if(phaseRef.current==='typing'){stopTyping();setTyped(chapters[indexRef.current].text.length);changePhase('reading');return;}
  if(indexRef.current>=chapters.length-1)return;
  const n=indexRef.current+1;changePhase('moving');setTyped(0);(game.current?.scene.getScene('journey') as Journey).go(n);
 },[ready,narrate,stopTyping,changePhase]);
 const go=useCallback((n:number)=>{
  if(phaseRef.current==='moving'||phaseRef.current==='intro')return;void audio.unlock();stopTyping();changePhase('moving');setTyped(0);(game.current?.scene.getScene('journey') as Journey).go(n);
 },[stopTyping,changePhase]);
 const restart=useCallback(()=>{if(phaseRef.current==='moving')return;go(0);},[go]);
 const toggleFullscreen=useCallback(async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{/* Not all embedded browsers allow fullscreen. */}},[]);
 useEffect(()=>{const sync=()=>setFullscreen(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync);},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.target instanceof Element&&e.target.closest('button')&&['Enter',' '].includes(e.key))return;if(['ArrowRight',' ','Enter'].includes(e.key)){e.preventDefault();next();}if(e.key==='ArrowLeft'){e.preventDefault();go(Math.max(0,indexRef.current-1));}if(e.key==='Home'){e.preventDefault();restart();}if(e.key.toLowerCase()==='m')setMuted(v=>!v);if(e.key.toLowerCase()==='f')void toggleFullscreen();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[next,go,restart,toggleFullscreen]);
 const intro=phase==='intro',moving=phase==='moving';
 return <main className={`presentation ${intro?'is-intro':''} ${moving?'is-moving':''}`} style={{'--accent':c.accent} as React.CSSProperties} onClick={e=>{if(!(e.target as HTMLElement).closest('button,a,summary'))next();}}>
  <div className="world" ref={host} role="img" aria-label="Пиксельное дерево коммуникаций: маленький рассказчик путешествует по его ветвям" />
  <div className="vignette"/>
  <header className="topbar">
   <div className="brand"><span className="brand-mark" aria-hidden="true"><i/><i/><i/><i/><i/></span><span>ДЕРЕВО<br/><b>КОММУНИКАЦИЙ</b></span></div>
   <div className="edition">ИНТЕРАКТИВНОЕ ПУТЕШЕСТВИЕ <span> / </span> 18 СЦЕН</div>
   <nav aria-label="Настройки презентации" className="tools">
    <button title={muted?'Включить звук (M)':'Выключить звук (M)'} aria-label={muted?'Включить звук':'Выключить звук'} aria-pressed={muted} onClick={()=>{void audio.unlock();setMuted(v=>!v);}}><Icon name={muted?'mute':'sound'}/></button>
    <button title="Полный экран (F)" aria-label={fullscreen?'Выйти из полного экрана':'Полный экран'} onClick={()=>void toggleFullscreen()}><Icon name="expand"/></button>
   </nav>
  </header>
  {intro ? <section className="cover" aria-labelledby="cover-title">
   <div className="eyebrow"><span/> МАЛЕНЬКАЯ ИСТОРИЯ О БОЛЬШИХ СВЯЗЯХ</div>
   <h1 id="cover-title">Всё начинается<br/>с <em>диалога.</em></h1>
   <p className="cover-topic">Влияние социальных сетей<br/>на корпоративные коммуникации</p>
   <button className="begin" disabled={!ready||error} onClick={next}><span>{error?'Не удалось запустить графику':ready?'Начать путешествие':'Пробуждаем лес…'}</span><Icon name="next"/></button>
   <div className="cover-details"><span>7–8 МИНУТ</span><i/><span>ОДНО КАСАНИЕ — НОВАЯ СЦЕНА</span></div>
   <span className="hero-intro-label">ваш проводник <span>↘</span></span>
  </section> : <>
   <section className="scene-heading" aria-label={`Сцена ${index+1} из 18`}><div className="eyebrow"><span/>{String(index+1).padStart(2,'0')} / {c.chapter}</div><h1>{c.title}</h1></section>
   <div className="location"><span className="location-dot"/>{moving?'В пути…':c.place}</div>
   <section className={`dialogue ${moving?'hidden':''}`} aria-label="Реплика рассказчика">
    <div className="speaker"><span className="speaker-light"/>ПРОВОДНИК<span className="speech-dots" aria-hidden="true">{phase==='typing'?'•••':''}</span></div>
    <p aria-hidden="true">{c.text.slice(0,typed)}<span className={`cursor ${phase==='typing'?'visible':''}`}/></p>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{moving?'':c.text}</p>
    <div className="dialogue-bottom"><span>{phase==='typing'?'КАСАНИЕ — ПОКАЗАТЬ ВЕСЬ ТЕКСТ':index===17?'КОНЕЦ ПУТЕШЕСТВИЯ':'КАСАНИЕ — ПРОДОЛЖИТЬ'}</span><span aria-hidden="true" className="continue-mark">{phase==='typing'?'···':'↓'}</span></div>
    <div className="bubble-tail"/>
   </section>
   {index===17&&!moving&&<span className="thank-you">Спасибо за внимание!</span>}
  </>}
  <footer className="bottom-bar">
   <div className="footer-left">{!intro?<><button className="back-button" disabled={moving||index===0} onClick={()=>go(Math.max(0,index-1))} aria-label="Предыдущая сцена" title="Предыдущая сцена (←)"><Icon name="back"/></button><button disabled={moving} onClick={restart} aria-label="Начать заново" title="Начать заново (Home)"><Icon name="restart"/></button><span className="scene-count">{String(index+1).padStart(2,'0')} <span>/ 18</span></span></>:<span className="footer-caption">СЛУШАТЬ. ПОНИМАТЬ. СОЕДИНЯТЬ.</span>}</div>
   {!intro&&<div className="progress" role="progressbar" aria-label="Прогресс путешествия" aria-valuemin={1} aria-valuemax={18} aria-valuenow={index+1}>{chapters.map((_,i)=><i key={i} className={i<=index?'done':''}/>)}</div>}
   <span className="footer-right">{intro?'ИСТОРИЯ, КОТОРОЙ УПРАВЛЯЕТЕ ВЫ':moving?'СЛЕДУЕМ ЗА ПРОВОДНИКОМ':<><kbd>←</kbd><kbd>→</kbd><span> ИЛИ КОСНИТЕСЬ ЭКРАНА</span></>}</span>
  </footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
