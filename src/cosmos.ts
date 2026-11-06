import Phaser from 'phaser';
import { chapters } from './story';

export const CORE = { x: 0, y: -1000 };
const ink = 0x281520, hat = 0x71442f, hatLight = 0x975b39;
const robe = 0x17636c, robeLight = 0x23828b, skin = 0xf2c181;
const pixel = (g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number,a=1) => {
  g.fillStyle(c,a);g.fillRect(Math.round(x),Math.round(y),w,h);
};

/** All poses share the same silhouette, pointed hat, robe, backpack and staff. */
export function makeWizardTextures(scene:Phaser.Scene) {
 const g=scene.make.graphics({x:0,y:0});
 for(let frame=0;frame<14;frame++){
  g.clear();const step=frame>=2&&frame<=5?(frame%2?2:-2):0;
  // Backpack behind the right shoulder.
  pixel(g,26,23,10,16,ink);pixel(g,29,24,8,13,hat);pixel(g,30,25,6,5,hatLight);pixel(g,32,30,2,2,ink);
  // Boots and long teal travelling coat.
  pixel(g,16,37,5,10+step,ink);pixel(g,23,37,5,10-step,ink);
  pixel(g,14,45+step,8,3,hat);pixel(g,22,45-step,8,3,hat);
  pixel(g,13,23,17,18,ink);pixel(g,14,24,14,15,robe);pixel(g,16,25,3,13,robeLight);pixel(g,14,38,15,3,0x124c57);
  pixel(g,27,25,3,15,0x103b43);pixel(g,13,25,3,13,0x103b43);
  // Face, dark hair and profile nose.
  pixel(g,13,14,16,10,ink);pixel(g,16,16,13,7,skin);pixel(g,27,18,4,3,skin);
  pixel(g,14,15,3,10,0x55351f);pixel(g,19,17,2,3,ink);pixel(g,25,17,2,2,ink);
  pixel(g,24,22,3,frame===1?2:1,0x8f4e31);
  // Curved tall hat, drawn as stepped pixels rather than a scaled illustration.
  for(const [x,y,w,h] of [[12,10,18,6],[15,7,15,5],[18,5,13,4],[21,3,12,4],[25,1,9,4],[28,0,7,3]])pixel(g,x,y,w,h,ink);
  for(const [x,y,w,h] of [[14,10,14,5],[17,8,12,4],[20,6,10,4],[23,4,9,4],[27,2,6,3]])pixel(g,x,y,w,h,hat);
  pixel(g,20,8,4,5,hatLight);pixel(g,25,5,4,4,hatLight);
  pixel(g,6,13,26,5,ink);pixel(g,8,13,22,3,hat);pixel(g,11,14,18,1,hatLight);
  pixel(g,29,15,7,3,ink);pixel(g,30,15,4,1,hat);
  // Hands and walking staff, held on the left throughout the journey.
  pixel(g,8,18,2,30,ink);pixel(g,9,20,1,27,0xaa713f);pixel(g,7,16,4,4,hat);
  pixel(g,10,28,5,6,robe);pixel(g,9,31,4,3,skin);
  pixel(g,28,27,4,9,ink);pixel(g,28,28,3,6,robeLight);pixel(g,28,34,3,3,skin);
  if(frame===7||frame===8||frame===11){pixel(g,29,27,6,4,robeLight);pixel(g,34,frame===11?20:24,3,7,skin);}
  if(frame===9){pixel(g,29,28,7,3,skin);pixel(g,34,23,4,7,ink);pixel(g,35,24,2,4,0x67e6ed);}
  if(frame===10){pixel(g,28,22,3,9,skin);pixel(g,26,22,5,3,skin);}
  if(frame===6){pixel(g,15,39,8,4,hat);pixel(g,24,39,8,4,hat);}
  if(frame===12){pixel(g,5,11,31,3,0x363576);pixel(g,9,8,23,4,0x6979c8);}
  g.generateTexture(`hero${frame}`,40,50);
 }
 g.destroy();
}

/** A pixelated, tilted accretion disk. No image assets or per-frame allocations. */
export function drawGalaxy(g:Phaser.GameObjects.Graphics,x:number,y:number,radius:number,time:number,intensity=1){
 const tilt=-.43,ct=Math.cos(tilt),st=Math.sin(tilt);
 const dot=(r:number,a:number,size:number,color:number,alpha:number)=>{
  const xx=Math.cos(a)*r,yy=Math.sin(a)*r*.42;
  pixel(g,Math.round((x+xx*ct-yy*st)/4)*4,Math.round((y+xx*st+yy*ct)/4)*4,size,size,color,alpha*intensity);
 };
 for(let arm=0;arm<4;arm++)for(let j=0;j<100;j++){
  const u=j/100,r=radius*(.12+u*.88),a=arm*Math.PI*.5+u*6.4-time;
  const color=u<.25?0xfff3c0:u<.48?0xa2fbff:u<.77?0x40e5fa:0x6688ff;
  dot(r,a,Math.max(4,Math.round((13-u*7)*radius/420)),color,.5+Math.sin(j*2.8+arm)*.2);
  if(j%3===0)dot(r+radius*.05,a+.04,5,0xc58de5,.55);
 }
 for(let n=0;n<120;n++){
  const a=n/120*Math.PI*2-time*.25;
  dot(radius*.21,a,9,0xfff4c6,.95);dot(radius*.29,a,6,0x9dfaff,.75);
 }
 // The quiet dark pupil keeps the guide legible inside the bright ring.
 g.fillStyle(0x17104c,intensity*.9);g.fillEllipse(x,y,radius*.3,radius*.13);
 pixel(g,x-7,y-5,14,10,0xe7ffff,intensity*.85);
}

export class Nebula extends Phaser.Scene {
 private stars:Phaser.GameObjects.Rectangle[]=[];
 private clouds:Phaser.GameObjects.Container[]=[];
 private galaxy!:Phaser.GameObjects.Graphics;
 private reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(){super('atmosphere');}
 create(){
  let seed=501;const rand=(a:number,b:number)=>{seed=seed*16807%2147483647;return a+seed/2147483647*(b-a);};
  const g=this.add.graphics();
  const stops=[0x140b3b,0x272180,0x2058ac,0x118fba];
  for(let y=0;y<800;y+=8){const k=y/800*3,i=Math.min(2,Math.floor(k)),c=Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(stops[i]),Phaser.Display.Color.ValueToColor(stops[i+1]),1,k-i);pixel(g,0,y,1280,8,Phaser.Display.Color.GetColor(c.r,c.g,c.b));}
  // Stepped nebulae in cobalt, violet, periwinkle and turquoise.
  for(let layer=0;layer<3;layer++){
   const con=this.add.container(0,0),cloud=this.add.graphics();con.add(cloud);this.clouds.push(con);
   for(let i=0;i<110;i++){
    const x=rand(-100,1380),base=170+layer*215+Math.sin(x*.008+layer)*85,y=base+rand(-55,55),sz=Math.floor(rand(15,65)/8)*8;
    const palette=[[0x40398e,0x6554ae,0x896eb6],[0x334da4,0x5b75bd,0xa983c0],[0x176cb0,0x19c5d3,0x83e7e6]][layer];
    pixel(cloud,x,y,sz*2,sz,palette[i%3],.38);pixel(cloud,x+8,y-8,sz,sz,palette[(i+1)%3],.3);
   }
  }
  const ridge=this.add.graphics();
  ridge.fillStyle(0x16103e);ridge.fillPoints([{x:0,y:800},{x:0,y:715},{x:145,y:670},{x:245,y:715},{x:380,y:530},{x:455,y:444},{x:487,y:378},{x:516,y:480},{x:560,y:522},{x:656,y:692},{x:780,y:631},{x:920,y:748},{x:1100,y:680},{x:1280,y:720},{x:1280,y:800}],true);
  ridge.lineStyle(5,0x3958a1,.45);ridge.strokePoints([{x:420,y:565},{x:486,y:409},{x:524,y:540},{x:558,y:588}]);
  this.galaxy=this.add.graphics();drawGalaxy(this.galaxy,1040,180,190,0,.6);
  for(let i=0;i<115;i++){
   const s=this.add.rectangle(rand(0,1280),rand(0,800),i%9===0?4:2,2,i%3?0xa3efff:0xffd5ef,rand(.25,.9));this.stars.push(s);
   if(i%17===0){pixel(g,s.x-5,s.y,12,2,0xf4eeff,.7);pixel(g,s.x,s.y-5,2,12,0xf4eeff,.7);}
  }
  this.scene.launch('journey');
 }
 focusFinale(active:boolean,reduced:boolean){this.tweens.killTweensOf(this.galaxy);this.tweens.add({targets:this.galaxy,alpha:active?0:1,duration:reduced?0:1400});}
 update(t:number){if(this.reduced)return;this.clouds.forEach((c,i)=>{c.x=Math.sin(t*.000035+i)*18;c.y=Math.cos(t*.000025+i)*8;});this.stars.forEach((s,i)=>{s.alpha=.35+Math.sin(t*.0008+i*3)*.23;});}
}

/** Topic routes wind into the same physical center as the narrator. */
export class CosmicNetwork {
 strength=.12;
 twist=0;
 convergence=0;
 private routes:Phaser.GameObjects.Graphics;
 private disk:Phaser.GameObjects.Graphics;
 private sparks:Phaser.GameObjects.Graphics;
 private geometryKey='';
 private frozenKey='';
 private last=-Infinity;
 constructor(scene:Phaser.Scene){this.routes=scene.add.graphics().setDepth(35);this.disk=scene.add.graphics().setDepth(40);this.sparks=scene.add.graphics().setDepth(36);}
 render(t:number,reduced:boolean){
  const key=`${this.strength.toFixed(3)}:${this.twist.toFixed(3)}:${this.convergence.toFixed(3)}`;
  if(reduced&&key===this.frozenKey)return;
  if(t-this.last<66)return;this.last=t;this.frozenKey=key;
  const rebuild=key!==this.geometryKey;this.geometryKey=key;
  const g=this.routes,p=this.sparks;if(rebuild)g.clear();p.clear();const tm=reduced?0:t*.00013;
  chapters.slice(0,16).forEach((c,i)=>{
   const dx=c.x-CORE.x,dy=c.y-35-CORE.y,r=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),points=[];
   if(rebuild)for(let n=0;n<=46;n++){const u=n/46,a=angle+u*u*(.48+this.twist*10),rr=r*(1-u);points.push({x:Math.round((CORE.x+Math.cos(a)*rr)/4)*4,y:Math.round((CORE.y+Math.sin(a)*rr)/4)*4});}
   const color=i%3===0?0xd39bf2:0x68efff;
   if(rebuild){g.lineStyle(10,color,this.strength*.07);g.strokePoints(points);g.lineStyle(3,color,this.strength*.65);g.strokePoints(points);pixel(g,c.x-5,c.y-40,10,10,color,this.strength);}
   for(let j=0;j<3;j++){
    const u=(tm*(.12+this.convergence*.65)+i*.061+j/3)%1,a=angle+u*u*(.48+this.twist*10),rr=r*(1-u),size=this.convergence>.5?9:5;
    pixel(p,CORE.x+Math.cos(a)*rr,CORE.y+Math.sin(a)*rr,size,size,0xc9ffff,this.strength*.85);
   }
  });
  this.disk.clear();
  if(this.strength>.3)drawGalaxy(this.disk,CORE.x,CORE.y-25,130+this.convergence*440,tm*(.3+this.convergence),Math.min(1,this.strength));
 }
}
