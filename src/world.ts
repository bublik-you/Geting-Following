import Phaser from 'phaser';
import { chapters, type Chapter } from './story';
import { audio } from './audio';
import { CORE, CosmicNetwork, makeWizardTextures, Nebula } from './cosmos';
export interface WorldBridge { ready: () => void; arrived: (index:number) => void; finale: (state:'idle'|'gathering'|'singularity') => void; }
let seed=2026;
function random(a:number,b:number){seed=(seed*16807)%2147483647;return a+(seed/2147483647)*(b-a);}
const C={bark:0x221840,edge:0x689dff,dark:0x110c2e,leaf:0x3436a0,light:0x6379d2,mint:0x6be5f7,cream:0xf0eaff};
function block(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number,a=1){g.fillStyle(c,a);g.fillRect(Math.round(x),Math.round(y),w,h);}
function bubble(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number){block(g,x+4,y,w-8,h,c);block(g,x,y+4,w,h-8,c);block(g,x+10,y+h-1,6,7,c);}
function label(s:Phaser.Scene,x:number,y:number,t:string,color='#d8cdff',size=14){return s.add.text(x,y,t,{fontFamily:'monospace',fontSize:size,color,align:'center',padding:{x:5,y:3}}).setOrigin(.5);}

export class Journey extends Phaser.Scene {
 private network!:CosmicNetwork;
 private hero!:Phaser.GameObjects.Sprite;
 private ride!:Phaser.GameObjects.Container;
 private world!:Phaser.GameObjects.Container;
 private bridge:WorldBridge;
 private moving=false;
 private talking=false;
 private chapter=0;
 private arrivalTime=0;
 private foliage:Phaser.GameObjects.Image[]=[];
 private effects:Phaser.GameObjects.Container[]=[];
 private destination(index:number){return index===17?{...chapters[index],x:CORE.x,y:CORE.y,zoom:.58}:index===16?{...chapters[index],x:480,y:-650}:chapters[index];}
 private aim(c:Chapter){const portrait=window.innerHeight>window.innerWidth;if(this.chapter===16)return portrait?{x:c.x,y:c.y-500}:{x:CORE.x-120,y:CORE.y-140};if(this.chapter===17)return {x:CORE.x-(portrait?0:440),y:CORE.y-(portrait?400:200)};return {x:c.x-(portrait?0:120),y:c.y-(portrait?300:210)};}
 private reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(bridge:WorldBridge){super('journey');this.bridge=bridge;}
 create(){
  seed=3481;this.makeTextures();this.world=this.add.container(0,0);
  this.makeTree();chapters.slice(0,16).forEach((c,i)=>this.makeLocation(c,i));
  this.network=new CosmicNetwork(this);
  this.ride=this.add.container(0,0).setDepth(50);
  this.hero=this.add.sprite(-210,0,'hero0').setScale(3).setOrigin(.5,1).setDepth(51);
  this.cameras.main.setZoom(1);const start=this.aim(chapters[0]);this.cameras.main.centerOn(start.x,start.y);this.scale.on('resize',()=>{if(!this.moving){const a=this.aim(this.destination(this.chapter));this.cameras.main.centerOn(a.x,a.y);}});this.cameras.main.fadeIn(this.reduced?10:1400,15,9,46);
  this.arrivalTime=this.time.now;
  this.tweens.add({targets:this.hero,x:0,duration:this.reduced?10:1400,ease:'Sine.easeOut',onComplete:()=>{this.bridge.ready();}});
 }
 private makeTextures(){
  const g=this.make.graphics({x:0,y:0});
  for(let variant=0;variant<4;variant++){
   g.clear();const colors=[0x22183e,0x2d2354,0x433c70,0x595b95,0x6e76b7];
   for(let i=0;i<70;i++){
    const x=random(10,170),y=random(12,86),nx=(x-90)/83,ny=(y-50)/42;
    if(nx*nx+ny*ny>1)continue;
    const size=Math.floor(random(14,32)/4)*4;
    block(g,Math.floor(x/4)*4,Math.floor(y/4)*4,size,size,colors[Math.min(4,Math.floor((1-y/100)*3+random(0,2)))]);
   }
   g.generateTexture(`foliage${variant}`,190,110);
  }
  makeWizardTextures(this);
  g.destroy();
 }
 private makeTree(){
  const g=this.add.graphics().setDepth(1);this.world.add(g);
  // A continuous trunk with visible roots, bark and branching routes.
  const trunk=[{x:-170,y:130},{x:-110,y:-450},{x:-150,y:-850},{x:-80,y:-1250},{x:-65,y:-1650},{x:10,y:-2240},{x:65,y:-1690},{x:100,y:-1300},{x:80,y:-850},{x:150,y:-400},{x:190,y:130}];
  g.fillStyle(C.bark);g.fillPoints(trunk,true);g.lineStyle(7,0x6f6cc0,.6);g.strokePoints(trunk,true);
  for(let i=0;i<150;i++){const y=random(-2150,110),width=(y+2300)/2300*240+20,x=random(-width/2,width/2);block(g,x,y,random(2,5),random(8,70),i%3===0?0xa18455:0x2e394c,.6);}
  for(let i=0;i<7;i++){g.lineStyle(24-i*2,C.bark);g.beginPath();g.moveTo(0,65);g.lineTo((i-3)*110,160);g.lineTo((i-3)*170,183);g.strokePath();}
  for(let i=2;i<16;i++){
   const c=chapters[i],sign=c.x<0?-1:1,points=[{x:0,y:c.y+240},{x:c.x*.48,y:c.y+75},{x:c.x,y:c.y+6},{x:c.x+sign*210,y:c.y-24}];
   g.lineStyle(45,C.dark);g.strokePoints(points);g.lineStyle(31,C.bark);g.strokePoints(points);g.lineStyle(5,C.edge,.8);g.strokePoints(points.map(p=>({x:p.x,y:p.y-13})));g.lineStyle(2,0x7ef5ff,.7);g.strokePoints(points.map(p=>({x:p.x+8,y:p.y+2})));
   for(let k=0;k<5;k++){
    const x=c.x+random(-230,260),y=c.y+random(90,160);const f=this.add.image(x,y,`foliage${k%4}`).setScale(random(.8,1.5)).setDepth(3);this.foliage.push(f);this.world.add(f);
   }
  }
  for(let i=0;i<38;i++){
   const angle=random(Math.PI,Math.PI*2),r=random(650,1450),x=Math.cos(angle)*r,y=-1400+Math.sin(angle)*r*.5;
   const f=this.add.image(x,y,`foliage${i%4}`).setScale(random(1,1.8)).setDepth(2).setAlpha(.85);this.world.add(f);
  }
  // A mossy forest floor and tiny flowers.
  for(let i=0;i<70;i++){const x=i*38-1330,y=150+Math.sin(i)*12;block(g,x,y,45,18,0x44406b);block(g,x+7,y-5,20,8,0x6772ab);if(i%4===0){block(g,x+15,y-24,3,20,0x676eac);block(g,x+11,y-26,11,5,0x89ade4);}}
  label(this,-225,133,'ДОВЕРИЕ', '#adbdff',12);label(this,0,160,'КУЛЬТУРА', '#adbdff',12);label(this,235,133,'ЦЕННОСТИ', '#adbdff',12);
  const roots=this.add.graphics().setDepth(3);for(let i=0;i<9;i++){block(roots,random(-320,320),random(20,110),6,6,0xd8b578,.6);}this.world.add(roots);
 }
 private person(g:Phaser.GameObjects.Graphics,x:number,y:number,c=0x796fb9){block(g,x,y-21,9,9,0xe8c5a1);block(g,x-3,y-11,15,14,c);block(g,x-2,y+3,5,9,0x2f2443);block(g,x+6,y+3,5,9,0x2f2443);}
 private envelope(g:Phaser.GameObjects.Graphics,x:number,y:number,c=0x89ace5){block(g,x,y,32,21,c);g.lineStyle(2,0x63558e);g.strokePoints([{x,y},{x:x+16,y:y+12},{x:x+32,y}]);}
 private building(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number){block(g,x,y,w,h,c);block(g,x-6,y-9,w+12,10,0x40375f);block(g,x+4,y-12,w+4,4,0x7181bd);for(let row=0;row<2;row++)for(let col=0;col<Math.floor(w/25);col++){block(g,x+9+col*25,y+12+row*27,13,16,0x7f89d4);block(g,x+14+col*25,y+12+row*27,3,16,c);}block(g,x+w*.45,y+h-29,16,29,0x2c2241);}
 private makeLocation(c:Chapter,i:number){
  const con=this.add.container(c.x,c.y).setDepth(6),g=this.add.graphics();con.add(g);this.effects[i]=con;
  // Every destination is physically attached to the same tree.
  block(g,-190,0,410,12,0x2b1e5a);block(g,-194,0,420,4,0x77d8f1);block(g,-165,12,370,13,0x3f3b62);
  const sign=this.add.container(-154,-40), sg=this.add.graphics();block(sg,-55,-15,110,26,0x2f244b);block(sg,-52,-17,104,3,0x656fa9);block(sg,-3,11,6,30,0x735e44);sign.add(sg);sign.add(label(this,0,-3,i<4?'КОРНИ И СВЯЗИ':c.chapter.toUpperCase(),i===14?'#d1b4cf':'#d9ceff',11));con.add(sign);
  switch(i){
   case 0:case 1:{
    for(let k=0;k<4;k++){this.person(g,90+k*28,-20,k%2?0xd0ad78:0x6d63a5);this.envelope(g,110+k*25,-100-k%2*20);}
    const lantern=this.add.rectangle(-85,-110,13,19,0xeed49a,.9);con.add(lantern);this.tweens.add({targets:lantern,alpha:.4,yoyo:true,repeat:-1,duration:1600});break;
   }
   case 2:{for(let k=0;k<3;k++){this.person(g,-125+k*26,-24);this.person(g,95+k*26,-24,0xcba478);}g.lineStyle(3,0x808ad6,.6);g.strokePoints([{x:-75,y:-66},{x:0,y:-95},{x:100,y:-66}]);break;}
   case 3:{
    for(let k=0;k<6;k++){const e=this.add.graphics();this.envelope(e,0,0);e.setPosition(-120+k*52,-80-Math.sin(k)*30);con.add(e);this.tweens.add({targets:e,y:e.y-18,alpha:.35,duration:1400+k*130,yoyo:true,repeat:-1});}break;
   }
   case 4:{
    for(let k=0;k<5;k++){const cloud=this.add.graphics();bubble(cloud,-80,-18,160,48,0xd9e3cb);cloud.setPosition(-210+k*110,-165-(k%2)*55).setAlpha(.32);con.add(cloud);this.tweens.add({targets:cloud,x:cloud.x+40,duration:5000+k*500,yoyo:true,repeat:-1});}
    this.drawPlane(g,145,-50,1);break;
   }
   case 5:{
    this.building(g,45,-140,145,140,0x565086);label(this,c.x+117,c.y-158,'ОТДЕЛЫ', '#b5dcff',12);
    for(let k=0;k<3;k++){this.person(g,60+k*38,-25);const e=this.add.graphics();this.envelope(e,0,0,0x9f87e1);e.setPosition(-120,-70);con.add(e);this.tweens.add({targets:e,x:62+k*40,y:-50,alpha:0,delay:k*500,duration:2100,repeat:-1,repeatDelay:600});}break;
   }
   case 6:{for(let k=0;k<5;k++){bubble(g,-190+k*88,-100-(k%2)*50,65,28,k%2?0x8ba6b5:0xc1d7cf);block(g,-180+k*88,-92-(k%2)*50,35,3,0x574979);}this.drawBird(g,130,-38,0);break;}
   case 7:{this.building(g,25,-105,70,105,0x5f538b);this.building(g,110,-150,75,150,0x625f9e);this.person(g,-83,-24,0xd69f86);this.person(g,-32,-24);bubble(g,-105,-100,70,30,0xdfb09b);bubble(g,-15,-153,75,30,0x828dd9);block(g,-90,-88,36,3,0x8e6258);block(g,-2,-140,45,3,0x555187);break;}
   case 8:case 9:{
    block(g,36,-300,163,300,0x231836);block(g,30,-285,175,270,0x231836);block(g,42,-273,151,235,0x3b315f);block(g,94,-289,45,5,0x5b5085);block(g,107,-22,18,8,0x57538b);
    bubble(g,55,-245,105,45,0x7f84d3);bubble(g,72,-177,105,53,0x7368ae);bubble(g,55,-106,105,41,0x7f84d3);
    for(let n=0;n<3;n++){block(g,65,-232+n*68,65,3,0x49416d);block(g,65,-222+n*68,48,3,0x49416d);}
    if(i===9){con.add(this.add.text(60,-237,'Где заказ?',{fontFamily:'monospace',fontSize:12,color:'#254f4a'}));con.add(this.add.text(78,-168,'Завтра,\nс 10 до 14',{fontFamily:'monospace',fontSize:12,color:'#153d36'}));}break;
   }
   case 10:{this.building(g,-145,-106,86,106,0x605994);this.building(g,50,-150,85,150,0x5d5187);this.building(g,148,-95,62,95,0x5e699c);block(g,-151,-73,97,10,0xd5b582);label(this,c.x-103,c.y-81,'КАФЕ','#e1cfff',11);for(let k=0;k<5;k++)this.person(g,-20+k*26,-16,k%2?0xb49b7f:0x7568ad);break;}
   case 11:{
    block(g,-60,-235,280,216,0x251c3c);block(g,-70,-243,300,13,0x7c7356);block(g,-46,-219,252,167,0xbccdb5);block(g,-46,-219,21,167,0xa47566);block(g,185,-219,21,167,0xa47566);
    const film=this.add.graphics();con.add(film);film.setPosition(80,-137);
    let f=0;const paint=()=>{film.clear();const color=[0x564c7f,0x678297,0x596894,0x8b736c][f%4];block(film,-102,-64,204,128,color);if(f%4===0){block(film,-28,-35,56,70,0x86a3e0);block(film,-16,-22,32,24,0x7870bb);}else if(f%4===1){this.person(film,-10,10,0xd5b88a);bubble(film,15,-35,60,35,0x87a6e1);}else if(f%4===2){for(let n=0;n<4;n++)block(film,-70+n*35,-30,25,12+n*10,0x8193d7);}else {bubble(film,-65,-35,70,33,0xc6d9c0);bubble(film,10,5,70,33,0xe0c19b);}f++;};paint();this.time.addEvent({delay:2400,loop:true,callback:paint});
    for(let n=0;n<6;n++){block(g,-32+n*37,-5,25,13,0x92745b);this.person(g,-24+n*37,-17);}break;
   }
   case 12:{this.building(g,38,-160,150,160,0x524b7d);for(let k=0;k<3;k++)this.person(g,62+k*43,-25);bubble(g,75,-140,72,35,0x8091d6);break;}
   case 13:{const symbols=['↗','↔','◇','✦','⌁'];for(let k=0;k<5;k++){const emblem=this.add.container(-160+k*78,-105-(k%2)*38),bg=this.add.graphics();bubble(bg,-22,-20,44,40,0x6676aa);emblem.add(bg);emblem.add(label(this,0,0,symbols[k],'#f5e8bb',27));con.add(emblem);if(!this.reduced)this.tweens.add({targets:emblem,y:emblem.y-13,duration:1400+k*130,yoyo:true,repeat:-1});}break;}
   case 14:{for(let k=0;k<14;k++){const leaf=this.add.rectangle(random(-180,210),random(-220,-40),10,5,k%2?0x6780ac:0x53558b,.65);con.add(leaf);this.tweens.add({targets:leaf,x:leaf.x+160,y:leaf.y+120,alpha:0,angle:180,duration:2200+k*100,repeat:-1});}block(g,110,-80,65,5,0x687bad);block(g,130,-100,6,85,0x4a547b);break;}
   case 15:{this.building(g,38,-155,150,155,0x64558d);g.fillStyle(0x8171bd);g.fillEllipse(113,-154,156,90);block(g,110,-221,6,42,0x818bd7);block(g,100,-229,27,8,0x818bd7);for(let k=0;k<4;k++)block(g,63+k*27,-83-k*12,16,42+k*12,0x7e7bcd);g.lineStyle(3,0xf0dca5);g.strokePoints([{x:-150,y:-64},{x:-120,y:-99},{x:-83,y:-83},{x:-45,y:-137}]);break;}
  }
 }
 private drawPlane(g:Phaser.GameObjects.Graphics,x:number,y:number,scale:number){
  g.fillStyle(0x8bace8);g.fillPoints([{x:x-68*scale,y:y-4},{x:x+75*scale,y:y-28*scale},{x:x+4*scale,y:y+34*scale},{x:x-12*scale,y:y+8*scale}],true);
  g.fillStyle(0x7f71bc);g.fillPoints([{x:x-12*scale,y:y+8*scale},{x:x+75*scale,y:y-28*scale},{x:x+4*scale,y:y+15*scale}],true);
  g.lineStyle(2,0x64558d,.8);g.lineBetween(x-12*scale,y+8*scale,x+75*scale,y-28*scale);
 }
 private drawBird(g:Phaser.GameObjects.Graphics,x:number,y:number,frame:number){
  block(g,x-48,y,92,27,0x7561a2);block(g,x-36,y-10,65,20,0x8573bf);block(g,x+28,y-22,33,36,0xb8d1c1);block(g,x+58,y-10,19,8,0xe1bc75);block(g,x+48,y-16,4,4,0x2e2440);block(g,x-74,y-8,32,14,0x65538a);
  const wing=frame%2===0?-40:14;block(g,x-31,y+wing,22,45,0x635289);block(g,x-22,y+wing+5,25,25,0x7567ac);
 }
 setTalking(value:boolean){this.talking=value;}
 go(index:number){
  if(this.moving)return;
  this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.chapter=index;this.moving=true;this.talking=false;audio.travel();
  const final=index===17,c=this.destination(index),from={x:this.hero.x,y:this.hero.y},duration=this.reduced?120:final?5600:c.motion==='zoom'?2600:2100;
  this.bridge.finale(final?'gathering':'idle');
  (this.scene.get('atmosphere') as Nebula).focusFinale(final,this.reduced);
  this.tweens.add({targets:this.network,strength:final?1:index===16?.8:.18,twist:final?1:0,convergence:final?1:0,duration,ease:'Sine.easeInOut'});
  this.tweens.add({targets:[this.world,...this.effects],alpha:final?.24:index===16?.65:1,duration});
  this.ride.removeAll(true);const vehicle=this.add.graphics();this.ride.add(vehicle);
  if(c.motion==='plane')this.drawPlane(vehicle,0,8,1.15);if(c.motion==='bird')this.drawBird(vehicle,0,10,0);
  this.ride.setVisible(c.motion==='plane'||c.motion==='bird');
  const camera=this.cameras.main,aim=this.aim(c);camera.pan(aim.x,aim.y,duration,'Sine.easeInOut',true);camera.zoomTo(c.zoom,duration,'Sine.easeInOut',true);
  const travel={t:0};this.tweens.add({targets:travel,t:1,duration,ease:'Sine.easeInOut',onUpdate:()=>{
   const t=travel.t,arch=c.motion==='walk'?Math.sin(t*Math.PI)*35:Math.sin(t*Math.PI)*(c.motion==='climb'?65:180);
   if(final){
    const dx=from.x-CORE.x,dy=from.y-CORE.y,r=Math.hypot(dx,dy)*Math.pow(1-t,1.2),angle=Math.atan2(dy,dx)+(this.reduced?0:Math.sin(t*Math.PI)*2.4);
    this.hero.setPosition(CORE.x+Math.cos(angle)*r,CORE.y+Math.sin(angle)*r);this.hero.setScale(3-t*.3);
   }else{this.hero.setScale(3);this.hero.setPosition(Phaser.Math.Linear(from.x,c.x,t),Phaser.Math.Linear(from.y,c.y,t)-arch);}
   this.ride.setPosition(this.hero.x,this.hero.y+12);
   this.hero.setFlipX(!final&&c.x<from.x);this.hero.setTexture(final?'hero8':c.motion==='plane'||c.motion==='bird'?'hero6':`hero${2+Math.floor(t*16)%4}`);
   if(c.motion==='bird'){vehicle.clear();this.drawBird(vehicle,0,10,Math.floor(t*14));}
  },onComplete:()=>{camera.panEffect.reset();camera.zoomEffect.reset();camera.setZoom(c.zoom);camera.centerOn(aim.x,aim.y);this.moving=false;this.hero.setFlipX(false);this.hero.setPosition(c.x,c.y);this.ride.setPosition(c.x,c.y+12);this.arrivalTime=this.time.now;audio.land();this.bridge.finale(final?'singularity':'idle');this.bridge.arrived(index);}});
  this.cameras.main.setBackgroundColor(index===14?'rgba(20,6,48,0.24)':'rgba(0,0,0,0)');
 }
 update(t:number){
  if(!this.hero)return;
  this.network.render(t,this.reduced);
  if(!this.moving){
   const c=this.destination(this.chapter),speaking=this.talking&&Math.floor(t/170)%2===0;let frame=speaking?1:0;
   if(c.mood==='point')frame=speaking?7:8;if(c.mood==='think')frame=10;if(c.mood==='phone')frame=9;if(c.mood==='shelter')frame=12;if(c.mood==='happy'&&!this.talking)frame=Math.floor(t/600)%2?11:0;
   if(this.chapter===4||this.chapter===5||this.chapter===6)frame=6;
   this.hero.setTexture(`hero${frame}`);const bob=this.reduced?0:Math.sin(t*.003)*1.4;this.hero.y=c.y+bob;this.ride.y=c.y+12+bob;
   if(this.chapter===17&&t-this.arrivalTime>500)this.hero.setTexture(Math.floor(t/450)%2?'hero11':'hero8');
  }
 }
}
// React handles navigation; Phaser must not suppress browser clicks after touch events.
export function createWorld(parent:HTMLElement,bridge:WorldBridge){return new Phaser.Game({type:Phaser.AUTO,parent,width:1280,height:800,transparent:true,input:{keyboard:false,mouse:false,touch:false,gamepad:false},pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{powerPreference:'low-power'},fps:{target:60,min:24},scene:[new Nebula(),new Journey(bridge)],audio:{noAudio:true},banner:false});}
