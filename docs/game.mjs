import { reflectPaddle, hitBrick } from './physics.mjs';
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const W = 960, H = 560;
const keys = new Set();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
let best = 0;
try { best = Number(localStorage.getItem('break-stuff-best')) || 0; theme = localStorage.getItem('break-stuff-theme') || theme; } catch {}
document.documentElement.dataset.theme = theme;
$('best').textContent = best;
let colors;
function palette() {
  const style = getComputedStyle(document.documentElement);
  colors = Object.fromEntries(['panel','text','muted','empty','paddle','accent'].map(name => [name, style.getPropertyValue(`--${name}`).trim()]));
}
palette();
$('theme').onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; palette(); try { localStorage.setItem('break-stuff-theme',theme); } catch {} draw(); };
let weeks = [], cells = [], bricks = [], particles = [];
let score = 0, lives = 3, mode = 'loading', previousMode = 'ready', speed = 330, last = 0;
const paddle = {x:420,y:520,w:120,h:10};
const ball = {x:480,y:511,r:5,vx:0,vy:0};
function scores() {
  $('score').textContent = score; $('lives').textContent = lives;
  $('remaining').textContent = bricks.filter(b => b.alive).length;
  if (score > best) { best = score; $('best').textContent = best; try { localStorage.setItem('break-stuff-best',best); } catch {} }
}
function overlay(title, copy, button) { $('overlay-title').textContent=title; $('overlay-copy').textContent=copy; $('play').textContent=button; $('play').disabled=false; $('overlay').hidden=false; }
function build() {
  cells=[];bricks=[];
  const step = Math.min(16, 848 / weeks.length), x0=(W-weeks.length*step)/2;
  weeks.forEach((week,col) => week.contributionDays.forEach(day => {
    const row = new Date(`${day.date}T12:00:00Z`).getUTCDay();
    const cell={x:x0+col*step,y:64+row*20,w:step-3,h:16,date:day.date,count:day.contributionCount};
    cells.push(cell);
    if(cell.count>0) bricks.push({...cell,alive:true,hp:Math.min(3,Math.ceil(Math.log2(cell.count+1)/2))});
  }));
}
function dock() { ball.x=paddle.x+paddle.w/2;ball.y=paddle.y-ball.r-2;ball.vx=ball.vy=0; }
function restart() { build(); score=0;lives=3;speed=330;particles=[];paddle.x=420;mode='ready';dock();$('overlay').hidden=true;$('pause').disabled=false;$('restart').disabled=false;$('pause').textContent='pause';$('status').textContent='space or tap to serve.';scores();canvas.focus({preventScroll:true}); }
function serve() {
  if(mode!=='ready')return;
  const target=bricks.filter(b=>b.alive).sort((a,b)=>b.y-a.y)[0];
  if(!target)return;
  const dx=target.x+target.w/2-ball.x,dy=target.y-ball.y, length=Math.hypot(dx,dy);
  ball.vx=dx/length*speed;ball.vy=dy/length*speed;mode='playing';$('status').textContent='break the green bits.';
}
function pause() {
  if(mode==='playing'||mode==='ready') {previousMode=mode;mode='paused';overlay('taking a break.','the stuff can wait.','resume');$('pause').textContent='resume';$('status').textContent='paused.';}
  else if(mode==='paused') {mode=previousMode;$('overlay').hidden=true;$('pause').textContent='pause';$('status').textContent=mode==='ready'?'space or tap to serve.':'break the green bits.';canvas.focus({preventScroll:true});}
}
$('play').onclick=()=>{if(mode==='error')load();else if(mode==='paused')pause();else {restart();serve();}};
$('restart').onclick=restart;$('pause').onclick=pause;
canvas.addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['arrowleft','arrowright','a','d',' ','p'].includes(key)){event.preventDefault();keys.add(key);if(!event.repeat){if(key===' '){if(mode==='ready')serve();else if(mode==='playing'||mode==='paused')pause();else if(mode==='intro'||mode==='over'||mode==='won'){restart();serve();}}if(key==='p')pause();}}});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();if(mode==='playing')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pause();});
function pointer(event) {const rect=canvas.getBoundingClientRect();paddle.x=Math.max(0,Math.min(W-paddle.w,(event.clientX-rect.left)/rect.width*W-paddle.w/2));if(mode==='ready')dock();}
canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointer(e);if(mode==='ready')serve();});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||canvas.hasPointerCapture(e.pointerId))pointer(e);});
function update(dt) {
  if(mode!=='playing'&&mode!=='ready')return;
  const direction=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0);
  paddle.x=Math.max(0,Math.min(W-paddle.w,paddle.x+direction*560*dt));
  if(mode==='ready'){dock();return;}
  const steps=Math.max(1,Math.ceil(speed*dt/4));
  for(let s=0;s<steps&&mode==='playing';s++) {
    const px=ball.x,py=ball.y;ball.x+=ball.vx*dt/steps;ball.y+=ball.vy*dt/steps;
    if(ball.x<ball.r){ball.x=ball.r;ball.vx=Math.abs(ball.vx);}if(ball.x>W-ball.r){ball.x=W-ball.r;ball.vx=-Math.abs(ball.vx);}if(ball.y<ball.r){ball.y=ball.r;ball.vy=Math.abs(ball.vy);}
    if(ball.vy>0&&py+ball.r<=paddle.y&&ball.y+ball.r>=paddle.y&&ball.x+ball.r>=paddle.x&&ball.x-ball.r<=paddle.x+paddle.w){ball.y=paddle.y-ball.r;reflectPaddle(ball,paddle,speed);}
    for(const brick of bricks){if(hitBrick(ball,brick,px,py)){ball.x=px;ball.y=py;brick.hp--;score+=5;if(brick.hp<=0){brick.alive=false;score+=10;if(!reducedMotion)for(let i=0;i<6;i++)particles.push({x:brick.x+brick.w/2,y:brick.y+8,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,life:.4});}speed=Math.min(470,speed+2);scores();break;}}
    if(bricks.every(b=>!b.alive)){mode='won';overlay('stuff broken.','all contribution days cleared. nice.','play again');$('status').textContent='all clear.';$('pause').disabled=true;}
    else if(ball.y>H+ball.r){lives--;scores();if(lives<=0){mode='over';overlay('some stuff remains.',`score: ${score}. give it another go?`,'try again');$('status').textContent='out of lives.';$('pause').disabled=true;}else{mode='ready';dock();$('status').textContent='space or tap to serve.';}}
  }
  particles=particles.filter(p=>(p.life-=dt)>0);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;}
}
function draw() {
  ctx.fillStyle=colors.panel;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=colors.empty;for(const cell of cells)ctx.fillRect(cell.x,cell.y,cell.w,cell.h);
  for(const brick of bricks){if(!brick.alive)continue;ctx.fillStyle=brick.hp===3?'#216e39':brick.hp===2?'#30a14e':'#40c463';ctx.fillRect(brick.x,brick.y,brick.w,brick.h);if(brick.hp>1){ctx.fillStyle='#b5f4c1';ctx.fillRect(brick.x+3,brick.y+3,brick.w-6,2);}}
  ctx.fillStyle=colors.paddle;ctx.fillRect(paddle.x,paddle.y,paddle.w,paddle.h);
  ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fillStyle=colors.accent;ctx.fill();
  for(const p of particles){ctx.globalAlpha=p.life/.4;ctx.fillStyle='#40c463';ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;
}
function frame(time){const dt=Math.min((time-last)/1000||0,.03);last=time;update(dt);draw();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
async function load(){
  mode='loading';$('play').disabled=true;$('play').textContent='loading contributions…';
  try {const response=await fetch('./contributions.json',{cache:'no-cache'});if(!response.ok)throw new Error('unavailable');const data=await response.json();if(!Array.isArray(data.weeks)||!data.weeks.length)throw new Error('invalid');weeks=data.weeks;build();if(!bricks.length)throw new Error('empty');scores();mode='intro';overlay('break the green bits.','a year of contributions. one small ball.','play');$('status').textContent=`${bricks.length} contribution days to break.`;const dates=cells.map(c=>c.date);$('source').textContent=`raullopesalves · ${dates[0]} to ${dates.at(-1)}`;}
  catch {mode='error';overlay('the bricks didn’t load.','check your connection and try again.','retry');$('status').textContent='contribution data unavailable.';}
}
load();
