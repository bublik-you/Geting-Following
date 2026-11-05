import Phaser from 'phaser';
import { chapters, type Chapter } from './story';
import { audio } from './audio';
export interface WorldBridge { ready: () => void; arrived: (index:number) => void; }
let seed=2026;
function random(a:number,b:number){seed=(seed*16807)%2147483647;return a+(seed/2147483647)*(b-a);}
const C={bark:0x735943,edge:0xb09060,dark:0x24403b,leaf:0x285950,light:0x719b69,mint:0xaed4a0,cream:0xf4e9c9};
function block(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number,a=1){g.fillStyle(c,a);g.fillRect(Math.round(x),Math.round(y),w,h);}
function bubble(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number){block(g,x+4,y,w-8,h,c);block(g,x,y+4,w,h-8,c);block(g,x+10,y+h-1,6,7,c);}
function label(s:Phaser.Scene,x:number,y:number,t:string,color='#dfdfbc',size=14){return s.add.text(x,y,t,{fontFamily:'monospace',fontSize:size,color,align:'center',padding:{x:5,y:3}}).setOrigin(.5);}

class Atmosphere extends Phaser.Scene {
 private motes:Phaser.GameObjects.Rectangle[]=[];
 constructor(){super('atmosphere');}
 create(){
  seed=2026; const g=this.add.graphics();
  const top=Phaser.Display.Color.ValueToColor(0x102e3a), bottom=Phaser.Display.Color.ValueToColor(0x4f7771);
  for(let y=0;y<800;y+=8){const c=Phaser.Display.Color.Interpolate.ColorWithColor(top,bottom,800,y);block(g,0,y,1280,8,Phaser.Display.Color.GetColor(c.r,c.g,c.b));}
  for(let i=0;i<90;i++)block(g,random(0,1280),random(0,450),i%5===0?3:2,2,0xe4ebd0,random(.15,.6));
  for(let r=120;r>20;r-=12){g.fillStyle(0xc8d9b4,.008);g.fillCircle(1055,155,r);}
  block(g,1035,125,38,58,0xd9dfb3,.82);block(g,1026,136,56,36,0xd9dfb3,.82);block(g,1020,145,66,20,0xd9dfb3,.82);
  for(let layer=0;layer<3;layer++){
   const col=[0x23454c,0x244c4f,0x1b4145][layer], base=530+layer*95;
   for(let i=0;i<22;i++){
    const x=i*78+random(-30,30),height=random(150,360),w=random(36,85);
    block(g,x,base-height,9,800,col);
    for(let j=0;j<7;j++){const yy=base-height+j*23,ww=w*(j/6+.35);block(g,x-ww/2,yy,ww,29,col,.65);block(g,x-ww/2+8,yy-8,ww-16,20,col,.65);}
   }
  }
  for(let i=0;i<8;i++){const mist=this.add.rectangle(random(0,1280),random(420,800),random(200,650),random(12,40),0xa6cfc0,.025);this.tweens.add({targets:mist,x:mist.x+140,duration:18000+i*1100,yoyo:true,repeat:-1});}
  for(let i=0;i<45;i++){const r=this.add.rectangle(random(0,1280),random(0,800),i%3?2:4,2,0xdae8ab,random(.1,.7));this.motes.push(r);}
  this.scene.launch('journey');
 }
 update(_t:number,dt:number){this.motes.forEach((p,i)=>{p.y-=dt*(.004+(i%5)*.002);p.x+=Math.sin(_t*.0004+i)*dt*.003;if(p.y<0)p.y=800;});}
}
export class Journey extends Phaser.Scene {
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
 private aim(c:Chapter){const portrait=window.innerHeight>window.innerWidth;return {x:c.x-(portrait?0:120),y:c.y-(portrait?300:210)};}
 private reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 constructor(bridge:WorldBridge){super('journey');this.bridge=bridge;}
 create(){
  seed=3481;this.makeTextures();this.world=this.add.container(0,0);
  this.makeTree();chapters.slice(0,16).forEach((c,i)=>this.makeLocation(c,i));
  this.makeConnections();
  this.ride=this.add.container(0,0).setDepth(50);
  this.hero=this.add.sprite(-210,0,'hero0').setScale(3).setOrigin(.5,1).setDepth(51);
  this.cameras.main.setZoom(1);const start=this.aim(chapters[0]);this.cameras.main.centerOn(start.x,start.y);this.scale.on('resize',()=>{if(!this.moving){const a=this.aim(chapters[this.chapter]);this.cameras.main.centerOn(a.x,a.y);}});this.cameras.main.fadeIn(this.reduced?10:1400,8,24,28);
  this.arrivalTime=this.time.now;
  this.tweens.add({targets:this.hero,x:0,duration:this.reduced?10:1400,ease:'Sine.easeOut',onComplete:()=>{this.bridge.ready();}});
 }
 private makeTextures(){
  const g=this.make.graphics({x:0,y:0});
  for(let variant=0;variant<4;variant++){
   g.clear();const colors=[0x183e3c,0x235448,0x3c7056,0x679566,0x91b781];
   for(let i=0;i<70;i++){
    const x=random(10,170),y=random(12,86),nx=(x-90)/83,ny=(y-50)/42;
    if(nx*nx+ny*ny>1)continue;
    const size=Math.floor(random(14,32)/4)*4;
    block(g,Math.floor(x/4)*4,Math.floor(y/4)*4,size,size,colors[Math.min(4,Math.floor((1-y/100)*3+random(0,2)))]);
   }
   g.generateTexture(`foliage${variant}`,190,110);
  }
  for(let frame=0;frame<14;frame++){
   g.clear();const stepping=frame>=2&&frame<=5, leg=stepping?(frame%2?2:-2):0;
   // One consistent tiny explorer: cream cap, dark hair, amber coat and teal scarf.
   block(g,8,24,4,6+leg,0x233e44);block(g,14,24,4,6-leg,0x233e44);
   block(g,7,29+leg,6,2,0x142b37);block(g,14,29-leg,6,2,0x142b37);
   block(g,7,15,12,11,0xc48b55);block(g,9,16,3,9,0xe6b96e);block(g,17,17,3,8,0x996440);
   block(g,6,17,3,8,0xdca56c);block(g,18,frame===7?11:18,3,frame===7?8:7,0xe4b790);
   if(frame===8){block(g,19,9,3,5,0xe4b790);block(g,20,8,2,2,0xf1cd9d);}
   if(frame===9){block(g,18,16,6,3,0xe4b790);block(g,22,12,3,6,0x172e37);block(g,23,13,1,3,0x9fcac0);}
   if(frame===10){block(g,18,12,3,6,0xe4b790);block(g,17,11,4,3,0xe4b790);}
   block(g,7,14,12,3,0x69a9a3);block(g,7,16,3,8,0x458d89);
   block(g,8,4,11,11,0xefc89a);block(g,7,5,3,8,0x54483d);block(g,8,3,12,4,0x54483d);
   block(g,7,2,12,4,0xe6dfb6);block(g,5,5,17,3,0xf5eac9);block(g,8,1,9,2,0xe6dfb6);
   block(g,16,9,2,2,0x25383b);block(g,18,12,2,frame===1?2:1,0x895b46);
   if(frame===6){block(g,8,25,5,2,0x233e44);block(g,17,25,5,2,0x233e44);}
   if(frame===11){block(g,4,10,3,10,0xe4b790);block(g,2,7,3,6,0xe4b790);}
   if(frame===12){block(g,6,2,3,15,0x6a8c63);block(g,2,0,23,5,0x92b77a);}
   g.generateTexture(`hero${frame}`,28,34);
  }
  g.destroy();
 }
 private makeTree(){
  const g=this.add.graphics().setDepth(1);this.world.add(g);
  // A continuous trunk with visible roots, bark and branching routes.
  const trunk=[{x:-170,y:130},{x:-110,y:-450},{x:-150,y:-850},{x:-80,y:-1250},{x:-65,y:-1650},{x:10,y:-2240},{x:65,y:-1690},{x:100,y:-1300},{x:80,y:-850},{x:150,y:-400},{x:190,y:130}];
  g.fillStyle(C.bark);g.fillPoints(trunk,true);g.lineStyle(7,0x98754e,.6);g.strokePoints(trunk,true);
  for(let i=0;i<150;i++){const y=random(-2150,110),width=(y+2300)/2300*240+20,x=random(-width/2,width/2);block(g,x,y,random(2,5),random(8,70),i%3===0?0xa18455:0x4c4939,.6);}
  for(let i=0;i<7;i++){g.lineStyle(24-i*2,C.bark);g.beginPath();g.moveTo(0,65);g.lineTo((i-3)*110,160);g.lineTo((i-3)*170,183);g.strokePath();}
  for(let i=2;i<16;i++){
   const c=chapters[i],sign=c.x<0?-1:1,points=[{x:0,y:c.y+240},{x:c.x*.48,y:c.y+75},{x:c.x,y:c.y+6},{x:c.x+sign*210,y:c.y-24}];
   g.lineStyle(45,C.dark);g.strokePoints(points);g.lineStyle(31,C.bark);g.strokePoints(points);g.lineStyle(5,C.edge,.8);g.strokePoints(points.map(p=>({x:p.x,y:p.y-13})));
   for(let k=0;k<8;k++){
    const x=c.x+random(-230,260),y=c.y+random(90,160);const f=this.add.image(x,y,`foliage${k%4}`).setScale(random(1.2,2)).setDepth(3);this.foliage.push(f);this.world.add(f);
   }
  }
  for(let i=0;i<60;i++){
   const angle=random(Math.PI,Math.PI*2),r=random(650,1450),x=Math.cos(angle)*r,y=-1400+Math.sin(angle)*r*.5;
   const f=this.add.image(x,y,`foliage${i%4}`).setScale(random(1.3,2.5)).setDepth(2).setAlpha(.85);this.world.add(f);
  }
  // A mossy forest floor and tiny flowers.
  for(let i=0;i<70;i++){const x=i*38-1330,y=150+Math.sin(i)*12;block(g,x,y,45,18,0x426b51);block(g,x+7,y-5,20,8,0x8eab75);if(i%4===0){block(g,x+15,y-24,3,20,0x88ac7b);block(g,x+11,y-26,11,5,0xe4d69c);}}
  label(this,-225,133,'ДОВЕРИЕ', '#b5c99e',12);label(this,0,160,'КУЛЬТУРА', '#b5c99e',12);label(this,235,133,'ЦЕННОСТИ', '#b5c99e',12);
  const roots=this.add.graphics().setDepth(3);for(let i=0;i<9;i++){block(roots,random(-320,320),random(20,110),6,6,0xd8b578,.6);}this.world.add(roots);
 }
 private person(g:Phaser.GameObjects.Graphics,x:number,y:number,c=0x91b9a5){block(g,x,y-21,9,9,0xe8c5a1);block(g,x-3,y-11,15,14,c);block(g,x-2,y+3,5,9,0x243c43);block(g,x+6,y+3,5,9,0x243c43);}
 private envelope(g:Phaser.GameObjects.Graphics,x:number,y:number,c=0xe5dfbb){block(g,x,y,32,21,c);g.lineStyle(2,0x608e87);g.strokePoints([{x,y},{x:x+16,y:y+12},{x:x+32,y}]);}
 private building(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number){block(g,x,y,w,h,c);block(g,x-6,y-9,w+12,10,0x375f57);block(g,x+4,y-12,w+4,4,0xa8bd8b);for(let row=0;row<2;row++)for(let col=0;col<Math.floor(w/25);col++){block(g,x+9+col*25,y+12+row*27,13,16,0xb8d4ab);block(g,x+14+col*25,y+12+row*27,3,16,c);}block(g,x+w*.45,y+h-29,16,29,0x223e41);}
 private makeLocation(c:Chapter,i:number){
  const con=this.add.container(c.x,c.y).setDepth(6),g=this.add.graphics();con.add(g);this.effects[i]=con;
  // Every destination is physically attached to the same tree.
  block(g,-190,0,410,12,0x91754c);block(g,-194,0,420,4,0xc8ad70);block(g,-165,12,370,13,0x426250);
  const sign=this.add.container(-154,-40), sg=this.add.graphics();block(sg,-55,-15,110,26,0x244b49);block(sg,-52,-17,104,3,0x8da97b);block(sg,-3,11,6,30,0x735e44);sign.add(sg);sign.add(label(this,0,-3,i<4?'КОРНИ И СВЯЗИ':c.chapter.toUpperCase(),i===14?'#d1b4cf':'#d4debc',11));con.add(sign);
  switch(i){
   case 0:case 1:{
    for(let k=0;k<4;k++){this.person(g,90+k*28,-20,k%2?0xd0ad78:0x7da594);this.envelope(g,110+k*25,-100-k%2*20);}
    const lantern=this.add.rectangle(-85,-110,13,19,0xeed49a,.9);con.add(lantern);this.tweens.add({targets:lantern,alpha:.4,yoyo:true,repeat:-1,duration:1600});break;
   }
   case 2:{for(let k=0;k<3;k++){this.person(g,-125+k*26,-24);this.person(g,95+k*26,-24,0xcba478);}g.lineStyle(3,0xb7d6aa,.6);g.strokePoints([{x:-75,y:-66},{x:0,y:-95},{x:100,y:-66}]);break;}
   case 3:{
    for(let k=0;k<6;k++){const e=this.add.graphics();this.envelope(e,0,0);e.setPosition(-120+k*52,-80-Math.sin(k)*30);con.add(e);this.tweens.add({targets:e,y:e.y-18,alpha:.35,duration:1400+k*130,yoyo:true,repeat:-1});}break;
   }
   case 4:{
    for(let k=0;k<5;k++){const cloud=this.add.graphics();bubble(cloud,-80,-18,160,48,0xd9e3cb);cloud.setPosition(-210+k*110,-165-(k%2)*55).setAlpha(.32);con.add(cloud);this.tweens.add({targets:cloud,x:cloud.x+40,duration:5000+k*500,yoyo:true,repeat:-1});}
    this.drawPlane(g,145,-50,1);break;
   }
   case 5:{
    this.building(g,45,-140,145,140,0x6a8675);label(this,c.x+117,c.y-158,'ОТДЕЛЫ', '#cad8b9',12);
    for(let k=0;k<3;k++){this.person(g,60+k*38,-25);const e=this.add.graphics();this.envelope(e,0,0,0xbce1df);e.setPosition(-120,-70);con.add(e);this.tweens.add({targets:e,x:62+k*40,y:-50,alpha:0,delay:k*500,duration:2100,repeat:-1,repeatDelay:600});}break;
   }
   case 6:{for(let k=0;k<5;k++){bubble(g,-190+k*88,-100-(k%2)*50,65,28,k%2?0x8ba6b5:0xc1d7cf);block(g,-180+k*88,-92-(k%2)*50,35,3,0x4c7779);}this.drawBird(g,130,-38,0);break;}
   case 7:{this.building(g,25,-105,70,105,0x6b8b83);this.building(g,110,-150,75,150,0x829e89);this.person(g,-83,-24,0xd69f86);this.person(g,-32,-24);bubble(g,-105,-100,70,30,0xdfb09b);bubble(g,-15,-153,75,30,0xb7d9a5);block(g,-90,-88,36,3,0x8e6258);block(g,-2,-140,45,3,0x598767);break;}
   case 8:case 9:{
    block(g,36,-300,163,300,0x182f36);block(g,30,-285,175,270,0x182f36);block(g,42,-273,151,235,0x315f56);block(g,94,-289,45,5,0x66857e);block(g,107,-22,18,8,0x738b7a);
    bubble(g,55,-245,105,45,0xb0d3ab);bubble(g,72,-177,105,53,0x79ae98);bubble(g,55,-106,105,41,0xb0d3ab);
    for(let n=0;n<3;n++){block(g,65,-232+n*68,65,3,0x486d60);block(g,65,-222+n*68,48,3,0x486d60);}
    if(i===9){con.add(this.add.text(60,-237,'Где заказ?',{fontFamily:'monospace',fontSize:12,color:'#254f4a'}));con.add(this.add.text(78,-168,'Завтра,\nс 10 до 14',{fontFamily:'monospace',fontSize:12,color:'#153d36'}));}break;
   }
   case 10:{this.building(g,-145,-106,86,106,0x779485);this.building(g,50,-150,85,150,0x668780);this.building(g,148,-95,62,95,0x8c9c7c);block(g,-151,-73,97,10,0xd5b582);label(this,c.x-103,c.y-81,'КАФЕ','#ece2ba',11);for(let k=0;k<5;k++)this.person(g,-20+k*26,-16,k%2?0xb49b7f:0x83ada0);break;}
   case 11:{
    block(g,-60,-235,280,216,0x1c3b3c);block(g,-70,-243,300,13,0x7c7356);block(g,-46,-219,252,167,0xbccdb5);block(g,-46,-219,21,167,0xa47566);block(g,185,-219,21,167,0xa47566);
    const film=this.add.graphics();con.add(film);film.setPosition(80,-137);
    let f=0;const paint=()=>{film.clear();const color=[0x567f73,0x678297,0x8c9470,0x8b736c][f%4];block(film,-102,-64,204,128,color);if(f%4===0){block(film,-28,-35,56,70,0xdee0bd);block(film,-16,-22,32,24,0x90bba1);}else if(f%4===1){this.person(film,-10,10,0xd5b88a);bubble(film,15,-35,60,35,0xe1dfbd);}else if(f%4===2){for(let n=0;n<4;n++)block(film,-70+n*35,-30,25,12+n*10,0xc9d7b2);}else {bubble(film,-65,-35,70,33,0xc6d9c0);bubble(film,10,5,70,33,0xe0c19b);}f++;};paint();this.time.addEvent({delay:2400,loop:true,callback:paint});
    for(let n=0;n<6;n++){block(g,-32+n*37,-5,25,13,0x92745b);this.person(g,-24+n*37,-17);}break;
   }
   case 12:{this.building(g,38,-160,150,160,0x607d70);for(let k=0;k<3;k++)this.person(g,62+k*43,-25);bubble(g,75,-140,72,35,0xc2d6aa);break;}
   case 13:{const symbols=['↗','↔','◇','✦','⌁'];for(let k=0;k<5;k++){const emblem=this.add.container(-160+k*78,-105-(k%2)*38),bg=this.add.graphics();bubble(bg,-22,-20,44,40,0x9baa76);emblem.add(bg);emblem.add(label(this,0,0,symbols[k],'#f5e8bb',27));con.add(emblem);if(!this.reduced)this.tweens.add({targets:emblem,y:emblem.y-13,duration:1400+k*130,yoyo:true,repeat:-1});}break;}
   case 14:{for(let k=0;k<14;k++){const leaf=this.add.rectangle(random(-180,210),random(-220,-40),10,5,k%2?0xaca874:0x728b72,.65);con.add(leaf);this.tweens.add({targets:leaf,x:leaf.x+160,y:leaf.y+120,alpha:0,angle:180,duration:2200+k*100,repeat:-1});}block(g,110,-80,65,5,0xa5ad79);block(g,130,-100,6,85,0x6c7b56);break;}
   case 15:{this.building(g,38,-155,150,155,0x6e8d8b);g.fillStyle(0x9ebdb5);g.fillEllipse(113,-154,156,90);block(g,110,-221,6,42,0xc3d7bb);block(g,100,-229,27,8,0xc3d7bb);for(let k=0;k<4;k++)block(g,63+k*27,-83-k*12,16,42+k*12,0xadcdb3);g.lineStyle(3,0xf0dca5);g.strokePoints([{x:-150,y:-64},{x:-120,y:-99},{x:-83,y:-83},{x:-45,y:-137}]);break;}
  }
 }
 private makeConnections(){
  const g=this.add.graphics().setDepth(4).setAlpha(0);this.world.add(g);
  chapters.slice(0,16).forEach(c=>{g.lineStyle(2,0xcbd99a,.45);g.lineBetween(0,-1000,c.x,c.y-20);g.fillStyle(0xe7e8ad);g.fillRect(c.x-4,c.y-24,8,8);});
  this.data.set('connections',g);
 }
 private drawPlane(g:Phaser.GameObjects.Graphics,x:number,y:number,scale:number){
  g.fillStyle(0xe8e6cc);g.fillPoints([{x:x-68*scale,y:y-4},{x:x+75*scale,y:y-28*scale},{x:x+4*scale,y:y+34*scale},{x:x-12*scale,y:y+8*scale}],true);
  g.fillStyle(0x9ebcb2);g.fillPoints([{x:x-12*scale,y:y+8*scale},{x:x+75*scale,y:y-28*scale},{x:x+4*scale,y:y+15*scale}],true);
  g.lineStyle(2,0x5a8d8c,.8);g.lineBetween(x-12*scale,y+8*scale,x+75*scale,y-28*scale);
 }
 private drawBird(g:Phaser.GameObjects.Graphics,x:number,y:number,frame:number){
  block(g,x-48,y,92,27,0x799fa2);block(g,x-36,y-10,65,20,0x9cbfba);block(g,x+28,y-22,33,36,0xb8d1c1);block(g,x+58,y-10,19,8,0xe1bc75);block(g,x+48,y-16,4,4,0x243b40);block(g,x-74,y-8,32,14,0x5b838a);
  const wing=frame%2===0?-40:14;block(g,x-31,y+wing,22,45,0x5d8589);block(g,x-22,y+wing+5,25,25,0x8eaca4);
 }
 setTalking(value:boolean){this.talking=value;}
 go(index:number){
  if(this.moving)return;
  this.chapter=index;this.moving=true;this.talking=false;audio.travel();const c=chapters[index],from={x:this.hero.x,y:this.hero.y},duration=this.reduced?120:c.motion==='zoom'?2600:2100;
  this.ride.removeAll(true);const vehicle=this.add.graphics();this.ride.add(vehicle);
  if(c.motion==='plane')this.drawPlane(vehicle,0,8,1.15);if(c.motion==='bird')this.drawBird(vehicle,0,10,0);
  this.ride.setVisible(c.motion==='plane'||c.motion==='bird');
  const camera=this.cameras.main,aim=this.aim(c);camera.pan(aim.x,aim.y,duration,'Sine.easeInOut',true);camera.zoomTo(c.zoom,duration,'Sine.easeInOut',true);
  const travel={t:0};this.tweens.add({targets:travel,t:1,duration,ease:'Sine.easeInOut',onUpdate:()=>{
   const t=travel.t,arch=c.motion==='walk'?Math.sin(t*Math.PI)*35:Math.sin(t*Math.PI)*(c.motion==='climb'?65:180);
   this.hero.setPosition(Phaser.Math.Linear(from.x,c.x,t),Phaser.Math.Linear(from.y,c.y,t)-arch);this.ride.setPosition(this.hero.x,this.hero.y+12);
   this.hero.setFlipX(c.x<from.x);this.hero.setTexture(c.motion==='plane'||c.motion==='bird'?'hero6':`hero${2+Math.floor(t*16)%4}`);
   if(c.motion==='bird'){vehicle.clear();this.drawBird(vehicle,0,10,Math.floor(t*14));}
  },onComplete:()=>{camera.panEffect.reset();camera.zoomEffect.reset();camera.setZoom(c.zoom);camera.centerOn(aim.x,aim.y);this.moving=false;this.hero.setFlipX(false);this.hero.setPosition(c.x,c.y);this.ride.setPosition(c.x,c.y+12);this.arrivalTime=this.time.now;audio.land();this.bridge.arrived(index);}});
  const connections=this.data.get('connections') as Phaser.GameObjects.Graphics;this.tweens.add({targets:connections,alpha:index>=16?1:0,duration:1200});
  this.cameras.main.setBackgroundColor(index===14?'rgba(14,28,47,0.24)':'rgba(0,0,0,0)');
 }
 update(t:number){
  if(!this.hero)return;
  if(!this.moving){
   const c=chapters[this.chapter],speaking=this.talking&&Math.floor(t/170)%2===0;let frame=speaking?1:0;
   if(c.mood==='point')frame=speaking?7:8;if(c.mood==='think')frame=10;if(c.mood==='phone')frame=9;if(c.mood==='shelter')frame=12;if(c.mood==='happy'&&!this.talking)frame=Math.floor(t/600)%2?11:0;
   if(this.chapter===4||this.chapter===5||this.chapter===6)frame=6;
   this.hero.setTexture(`hero${frame}`);const bob=this.reduced?0:Math.sin(t*.003)*1.4;this.hero.y=c.y+bob;this.ride.y=c.y+12+bob;
   if(this.chapter===17&&t-this.arrivalTime>500)this.hero.setTexture(Math.floor(t/450)%2?'hero11':'hero8');
  }
 }
}
export function createWorld(parent:HTMLElement,bridge:WorldBridge){return new Phaser.Game({type:Phaser.AUTO,parent,width:1280,height:800,transparent:true,pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{powerPreference:'low-power'},fps:{target:60,min:24},scene:[new Atmosphere(),new Journey(bridge)],audio:{noAudio:true},banner:false});}
