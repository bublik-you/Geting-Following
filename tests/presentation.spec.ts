import {test,expect} from '@playwright/test';

test('all 18 chapters, narration, transition lock, back, mute and replay',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');
 await expect(page.getByRole('button',{name:'Начать путешествие'})).toBeEnabled();
 await expect(page.locator('canvas')).toBeVisible();
 await page.getByRole('button',{name:'Начать путешествие'}).click();
 await expect(page.locator('.scene-count')).toContainText('01');
 await expect(page.locator('.dialogue')).toBeVisible();
 await page.keyboard.press('ArrowRight'); // reveal first sentence in full
 await expect(page.locator('.dialogue-bottom')).toContainText('ПРОДОЛЖИТЬ');
 const first=await page.locator('.dialogue p[aria-hidden]').textContent();expect(first!.length).toBeGreaterThan(250);
 // A rapid second click during travel must not skip chapter 2.
 await page.evaluate(()=>{for(let i=0;i<4;i++)window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}));});
 await expect(page.locator('.scene-count')).toContainText('02');
 await expect(page.locator('.presentation')).not.toHaveClass(/is-moving/);
 for(let i=2;i<=18;i++){
  await expect(page.locator('.scene-count')).toContainText(String(i).padStart(2,'0'));
  await expect(page.locator('.presentation')).not.toHaveClass(/is-moving/);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.dialogue-bottom')).toContainText(i===18?'КОНЕЦ':'ПРОДОЛЖИТЬ');
  await expect(page.locator('.dialogue p[aria-hidden]')).not.toBeEmpty();
  if(i<18)await page.keyboard.press('ArrowRight');
 }
 await expect(page.getByText('Спасибо за внимание!',{exact:true})).toBeVisible();
 await page.keyboard.press('ArrowRight');await expect(page.locator('.scene-count')).toContainText('18');
 await page.keyboard.press('ArrowLeft');await expect(page.locator('.scene-count')).toContainText('17');
 await expect(page.locator('.presentation')).not.toHaveClass(/is-moving/);
 await page.getByRole('button',{name:'Выключить звук'}).click();await expect(page.getByRole('button',{name:'Включить звук'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Начать заново'}).click();await expect(page.locator('.scene-count')).toContainText('01');
 await expect(page.locator('.presentation')).not.toHaveClass(/is-moving/);
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(1000);await expect(page.locator('.scene-count')).toContainText('01');
 expect(errors).toEqual([]);
});

test('Android tablet touch, text bounds and landscape resizing',async({browser,baseURL})=>{
 test.setTimeout(180000); // Full touch journey plus four viewport sizes on software-rendered Chromium.
 const context=await browser.newContext({baseURL,viewport:{width:1024,height:768},hasTouch:true,isMobile:true,deviceScaleFactor:1,reducedMotion:'reduce'});const page=await context.newPage();
 await page.goto('./');await page.getByRole('button',{name:'Начать путешествие'}).tap();
 await page.locator('.dialogue').tap(); // finish typing
 await expect(page.locator('.dialogue-bottom')).toContainText('ПРОДОЛЖИТЬ');
 for(const size of [{width:1024,height:768},{width:1280,height:720},{width:800,height:1280},{width:390,height:844}]){
  await page.setViewportSize(size);await page.waitForTimeout(150);
  const box=await page.locator('.dialogue').boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThan(0);expect(box!.x+box!.width).toBeLessThanOrEqual(size.width);expect(box!.y).toBeGreaterThan(90);expect(box!.y+box!.height).toBeLessThan(size.height-70);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
 }
 await page.setViewportSize({width:1024,height:768});
 for(let i=2;i<=18;i++){
  await page.touchscreen.tap(12,380);
  await expect(page.locator('.scene-count')).toContainText(String(i).padStart(2,'0'));
  await expect(page.locator('.presentation')).not.toHaveClass(/is-moving/);
  await page.locator('.dialogue').tap();
  await expect(page.locator('.dialogue-bottom')).toContainText(i===18?'КОНЕЦ':'ПРОДОЛЖИТЬ');
 }
 await expect(page.getByText('Спасибо за внимание!',{exact:true})).toBeVisible();
 await context.close();
});

test('normal camera transitions ignore repeated input and do not advance on their own',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'Начать путешествие'}).click();await page.keyboard.press('ArrowRight');
 await page.keyboard.press('ArrowRight');await expect(page.locator('.presentation')).toHaveClass(/is-moving/);
 await page.evaluate(()=>{for(let i=0;i<12;i++)window.dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowRight':'ArrowLeft'}));});
 await expect(page.locator('.scene-count')).toContainText('02');await expect(page.locator('.presentation')).not.toHaveClass(/is-moving/);
 await page.keyboard.press('ArrowRight');await expect(page.locator('.dialogue-bottom')).toContainText('ПРОДОЛЖИТЬ');
 await page.waitForTimeout(800);await expect(page.locator('.scene-count')).toContainText('02');
});

test('speech synthesizes audio after a gesture and stops when muted or revealed',async({page})=>{
 await page.addInitScript(()=>{
  const nativeStart=OscillatorNode.prototype.start;
  (window as unknown as {scheduledTones:number}).scheduledTones=0;
  OscillatorNode.prototype.start=function(when?:number){(window as unknown as {scheduledTones:number}).scheduledTones++;return nativeStart.call(this,when);};
 });
 await page.goto('./');await page.getByRole('button',{name:'Начать путешествие'}).click();
 const tones=()=>page.evaluate(()=>(window as unknown as {scheduledTones:number}).scheduledTones);
 await expect.poll(tones).toBeGreaterThan(2);
 await page.getByRole('button',{name:'Выключить звук'}).click();const mutedCount=await tones();await page.waitForTimeout(600);expect(await tones()).toBe(mutedCount);
 await page.getByRole('button',{name:'Включить звук'}).click();await expect.poll(tones).toBeGreaterThan(mutedCount);
 await page.keyboard.press('ArrowRight');const revealedCount=await tones();await page.waitForTimeout(600);expect(await tones()).toBe(revealedCount);
});
