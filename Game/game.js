/* ═══════════════════════════════════════════
   AUDIO ENGINE
═══════════════════════════════════════════ */
var audioCtx=null;
function getAudio(){if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}return audioCtx;}
function playTone(freq,type,dur,vol,del){
  if(!cfg.sound)return;var ac=getAudio();if(!ac)return;
  try{var o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime+del);g.gain.setValueAtTime(vol,ac.currentTime+del);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+del+dur);o.start(ac.currentTime+del);o.stop(ac.currentTime+del+dur+0.01);}catch(e){}
}
function sfxJump(){playTone(220,'sine',.08,.12,0);playTone(330,'sine',.06,.08,.06);}
function sfxStar(){playTone(660,'sine',.1,.15,0);playTone(880,'sine',.1,.12,.08);playTone(1100,'sine',.12,.1,.16);}
function sfxPhase(){for(var i=0;i<6;i++)playTone(200+i*60,'sawtooth',.08,.06,i*.04);}
function sfxDeath(){playTone(200,'sawtooth',.15,.2,0);playTone(150,'sawtooth',.2,.18,.1);playTone(80,'square',.3,.15,.2);}
function sfxWin(){[440,550,660,880].forEach(function(f,i){playTone(f,'sine',.18,.12,i*.12);});}
function sfxClick(){playTone(440,'sine',.05,.08,0);}

/* ═══════════════════════════════════════════
   SAVE / SETTINGS
═══════════════════════════════════════════ */
var SAVE_KEY='mpSave_v2';
var save={unlocked:[0],stars:{},deaths:{}};
try{var s=localStorage.getItem(SAVE_KEY);if(s)save=JSON.parse(s);}catch(e){}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}}
var cfg={shake:true,scan:true,sound:true};
function toggleSetting(k,el){cfg[k]=!cfg[k];el.classList.toggle('on',cfg[k]);if(k==='scan')document.body.classList.toggle('no-scan',!cfg[k]);sfxClick();}
function resetProgress(){if(confirm('Wipe all progress?')){save={unlocked:[0],stars:{},deaths:{}};persist();buildGrid();}}

/* ═══════════════════════════════════════════
   SCREEN ROUTER
═══════════════════════════════════════════ */
var curScreen='home';
function showScreen(id){
  sfxClick();
  document.querySelectorAll('.screen').forEach(function(s){s.classList.add('hidden');});
  document.getElementById(id).classList.remove('hidden');
  curScreen=id;
  if(id==='levelSelect')buildGrid();
  if(id==='vsLevelSelect')buildVsGrid();
  if(id==='home')animateHome();
}

/* ═══════════════════════════════════════════
   LEVEL DATA (800x380 design space)
═══════════════════════════════════════════ */


/* ═══════════════════════════════════════════
   LEVEL SELECT
═══════════════════════════════════════════ */
function buildGrid(){
  var grid=document.getElementById('lsGrid');grid.innerHTML='';
  var tot=0,got=0;
  LEVELS.forEach(function(lv,i){
    var mx=lv.stars.length,g=save.stars[i]||0;tot+=mx;got+=g;
    var locked=!save.unlocked.includes(i),done=g>=mx;
    var card=document.createElement('div');card.className='level-card'+(locked?' locked':'');
    var tags=(lv.tags||[]).map(function(t){return '<span class="lc-tag '+t+'">'+t.toUpperCase()+'</span>';}).join(' ');
    card.innerHTML='<div class="lc-num">0'+(i+1)+'</div>'+(tags?'<div style="margin-bottom:4px">'+tags+'</div>':'')+'<div class="lc-name">'+lv.name+'</div><div class="lc-desc">'+lv.desc+'</div><div class="lc-stars">'+Array.from({length:mx},function(_,j){return '<div class="sp '+(j<g?'e':'u')+'"></div>';}).join('')+'</div>'+(locked?'<div class="lc-lock">🔒</div>':done?'<div class="lc-badge">CLEAR</div>':'');
    if(!locked)card.onclick=function(){launchLevel(i);};
    grid.appendChild(card);
  });
  document.getElementById('lsStats').textContent=got+' / '+tot+' \u2605';
}

/* ═══════════════════════════════════════════
   SOLO GAME ENGINE
═══════════════════════════════════════════ */
var canvas=document.getElementById('gc');
var ctx=canvas.getContext('2d');
var W=800,H=380;
var G=null,raf=null;

function resizeCanvas(){
  var w=document.getElementById('canvasWrap');
  W=w.clientWidth;H=w.clientHeight;canvas.width=W;canvas.height=H;
}

function launchLevel(idx){
  sfxClick();resizeCanvas();showScreen('gameScreen');
  document.getElementById('gameOverlay').classList.add('hidden');
  G=new Game(idx);
  if(raf)cancelAnimationFrame(raf);
  var last=null;
  function loop(ts){if(!G)return;if(last===null)last=ts;var dt=Math.min((ts-last)/16.67,2.5);last=ts;G.update(dt);G.draw();raf=requestAnimationFrame(loop);}
  raf=requestAnimationFrame(loop);
}

function pauseGame(){if(raf){cancelAnimationFrame(raf);raf=null;}G=null;showScreen('levelSelect');}

/* ── Solo Input ── */
var held={};
var jumpBuffer=0;

document.addEventListener('keydown',function(e){
  if(curScreen!=='vsScreen'){
    if(e.code==='ArrowLeft'||e.code==='KeyA')held.left=true;
    if(e.code==='ArrowRight'||e.code==='KeyD')held.right=true;
    if((e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')&&!held.jump){held.jump=true;jumpBuffer=8;}
    if(e.code==='KeyF'||e.code==='KeyS'){if(G)G.tryPhase();}
    if(e.code==='KeyR'&&curScreen==='gameScreen'&&G)launchLevel(G.idx);
    if(e.code==='Escape'&&curScreen==='gameScreen')pauseGame();
  }
  if(curScreen==='vsScreen'){
    if(e.code==='KeyA')heldP1.left=true;
    if(e.code==='KeyD')heldP1.right=true;
    if(e.code==='KeyS')heldP1.down=true;
    if((e.code==='KeyW'||e.code==='Space')&&!heldP1.jump){heldP1.jump=true;p1JumpBuf=8;}
    if(e.code==='KeyF'&&VG1)VG1.tryPhase();
    if(e.code==='ArrowLeft')heldP2.left=true;
    if(e.code==='ArrowRight')heldP2.right=true;
    if(e.code==='ArrowDown')heldP2.down=true;
    if(e.code==='ArrowUp'&&!heldP2.jump){heldP2.jump=true;p2JumpBuf=8;}
    if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&VG2)VG2.tryPhase();
    if(e.code==='Escape')pauseVsGame();
  }
  if(['Space','ArrowUp','ArrowLeft','ArrowRight','ArrowDown'].indexOf(e.code)!==-1)e.preventDefault();
});

document.addEventListener('keyup',function(e){
  if(e.code==='ArrowLeft'||e.code==='KeyA'){held.left=false;heldP1.left=false;}
  if(e.code==='ArrowRight'||e.code==='KeyD'){held.right=false;heldP1.right=false;}
  if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space'){held.jump=false;heldP1.jump=false;}
  if(e.code==='ArrowDown'||e.code==='KeyS'){heldP1.down=false;}
  if(e.code==='ArrowLeft')heldP2.left=false;
  if(e.code==='ArrowRight')heldP2.right=false;
  if(e.code==='ArrowUp')heldP2.jump=false;
  if(e.code==='ArrowDown')heldP2.down=false;
});

function bindTC(id,key,phaseCb){
  var b=document.getElementById(id);
  b.addEventListener('pointerdown',function(e){e.preventDefault();if(key!=='_phase')held[key]=true;b.classList.add('pressed');if(phaseCb&&G)G.tryPhase();else if(key==='jump')jumpBuffer=8;});
  ['pointerup','pointerleave','pointercancel'].forEach(function(ev){b.addEventListener(ev,function(e){e.preventDefault();if(key!=='_phase')held[key]=false;b.classList.remove('pressed');});});
}
bindTC('tcL','left');bindTC('tcR','right');bindTC('tcJump','jump');bindTC('tcPhase','_phase',true);

/* ═══ GAME CLASS (Solo) ═══ */
function Game(idx){
  this.idx=idx;this.lv=LEVELS[idx];this.deaths=0;
  this.pts=[];this.trails=[];this.sx=0;this.sy=0;
  this.flipped=false;this.charges=3;this.flash=0;this.flashCol='#fff';this.done=false;
  this._prevJump=false;
  this.stars=this.lv.stars.map(function(s,i){return {x:s.x,y:s.y,w:16,h:16,got:false,i:i,bob:Math.random()*Math.PI*2};});
  this.movingPlatState=[];this.enemies=[];
  this.bgStars=Array.from({length:40},function(){return {nx:Math.random(),ny:Math.random(),r:Math.random()*1.3+.3,col:Math.random()>.5?'#00d4ff':'#ff6b35',a:Math.random()*.3+.08,tw:Math.random()*Math.PI*2};});
  this.initP();this.hud();
}

Game.prototype.initP=function(){
  var s=this.lv.start,sx=W/800,sy=H/380;
  this.p={x:s.x*sx,y:s.y*sy,w:22*sx,h:30*sy,vx:0,vy:0,og:false,dead:false,dt:0,coyote:0,jbuf:0,movingVx:0};
  var self=this;
  this.movingPlatState=this.lv.platforms.map(function(p){return p.moving?{x:p.x*(W/800),dir:1}:null;});
  this.enemies=this.lv.enemies.map(function(e){return {cx:e.x*(W/800),y:e.y*(H/380),w:e.w*(W/800),h:e.h*(H/380),px1:e.px1*(W/800),px2:e.px2*(W/800),speed:e.speed||1.5,dir:1};});
  this.stars=this.lv.stars.map(function(s,i){return {x:s.x,y:s.y,w:16*(W/800),h:16*(H/380),got:false,i:i,bob:self.stars[i]?self.stars[i].bob:Math.random()*Math.PI*2};});
};

Game.prototype.sc=function(v,axis){return axis==='x'?v*(W/800):v*(H/380);};

Game.prototype.rawPlats=function(){
  var self=this;
  return this.lv.platforms.map(function(p,i){
    var mp=self.movingPlatState[i],rx=mp?mp.x:self.sc(p.x,'x');
    return {x:rx,y:self.sc(p.y,'y'),w:self.sc(p.w,'x'),h:self.sc(p.h,'y'),wall:!!p.wall,moving:!!p.moving,vx:mp?(mp.dir*(p.speed||1)*(W/800)):0};
  });
};
Game.prototype.plats=function(){var r=this.rawPlats();return this.flipped?r.map(function(p){return {x:p.x,y:H-p.y-p.h,w:p.w,h:p.h,wall:p.wall,moving:p.moving,vx:p.vx};}):r;};

Game.prototype.rawHazards=function(){var self=this;return this.lv.hazards.map(function(h){return {x:self.sc(h.x,'x'),y:self.sc(h.y,'y'),w:self.sc(h.w,'x'),h:self.sc(h.h,'y')};});};
Game.prototype.hazards=function(){var r=this.rawHazards();return this.flipped?r.map(function(h){return {x:h.x,y:H-h.y-h.h,w:h.w,h:h.h};}):r;};

Game.prototype.rawEnemies=function(){var self=this;return this.enemies.map(function(e){return {cx:e.cx,y:e.y,w:e.w,h:e.h,px1:e.px1,px2:e.px2,speed:e.speed,dir:e.dir};});};
Game.prototype.getEnemies=function(){var r=this.rawEnemies();return this.flipped?r.map(function(e){return {cx:e.cx,y:H-e.y-e.h,w:e.w,h:e.h,px1:e.px1,px2:e.px2,speed:e.speed,dir:e.dir};}):r;};

Game.prototype.getStars=function(){
  var sx=W/800,sy=H/380,self=this;
  return this.stars.map(function(s){
    var dy=self.flipped?H-s.y*sy-s.h:s.y*sy;
    return {x:s.x,y:s.y,dx:s.x*sx,dy:dy,dw:s.w,dh:s.h,got:s.got,i:s.i,bob:s.bob};
  });
};

Game.prototype.getExit=function(){
  var e=this.lv.exit,sx=W/800,sy=H/380;
  var ey=this.flipped?H-e.y*sy-e.h*sy:e.y*sy;
  return {x:e.x*sx,y:ey,w:e.w*sx,h:e.h*sy,req:e.req};
};

Game.prototype.burst=function(x,y,col,n){
  for(var i=0;i<n;i++){var a=(Math.PI*2/n)*i+Math.random()*.35,sp=2+Math.random()*5;this.pts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,col:col,size:2+Math.random()*2});}
};

Game.prototype.tryPhase=function(){
  if(this.charges<=0||this.p.dead||this.done)return;
  sfxPhase();this.charges--;this.flipped=!this.flipped;
  this.p.y=H-this.p.y-this.p.h;this.p.vy=0;this.p.vx*=0.5;this.p.og=false;this.p.coyote=0;
  for(var i=0;i<30;i++){
    var stuck=false,plats=this.plats(),p=this.p;
    for(var j=0;j<plats.length;j++){
      var pl=plats[j];if(pl.wall)continue;
      if(p.x+p.w>pl.x&&p.x<pl.x+pl.w&&p.y+p.h>pl.y&&p.y<pl.y+pl.h){
        stuck=true;var ot=p.y+p.h-pl.y,ob=pl.y+pl.h-p.y;
        if(ot<ob)p.y=pl.y-p.h-1;else p.y=pl.y+pl.h+1;break;
      }
    }
    if(!stuck)break;
  }
  this.flash=14;this.flashCol=this.flipped?'#ff6b35':'#00d4ff';
  this.burst(this.p.x+this.p.w/2,this.p.y+this.p.h/2,this.flashCol,30);
  if(cfg.shake){this.sx=11;this.sy=10;}this.hud();
};

Game.prototype.hud=function(){
  var g=this.stars.filter(function(s){return s.got;}).length;
  document.getElementById('hudLvlName').textContent='LVL '+(this.idx+1)+': '+this.lv.name;
  var d=document.getElementById('hudDim');d.textContent=this.flipped?'\u25BC OMEGA':'\u25B2 ALPHA';d.className=this.flipped?'omega':'';
  document.getElementById('hudStars').textContent='\u2605 '+g+'/'+this.stars.length;
  var ph='';for(var i=0;i<3;i++)ph+=i<this.charges?'\u25CF':'\u25CB';
  document.getElementById('hudPhase').textContent='PHASE '+ph;
  document.getElementById('hudDeaths').textContent='DEATHS: '+this.deaths;
};

Game.prototype.updateMovingPlats=function(dt){
  var self=this;
  this.lv.platforms.forEach(function(p,i){
    if(!p.moving||!self.movingPlatState[i])return;
    var ms=self.movingPlatState[i],spd=(p.speed||1)*(W/800)*dt;
    ms.x+=ms.dir*spd;
    var x1=p.mx1*(W/800),x2=(p.mx2||p.mx1+200)*(W/800);
    if(ms.x<=x1){ms.x=x1;ms.dir=1;}if(ms.x>=x2){ms.x=x2;ms.dir=-1;}
  });
};

Game.prototype.updateEnemies=function(dt){
  var self=this;
  this.enemies.forEach(function(e){var spd=e.speed*(W/800)*dt;e.cx+=e.dir*spd;if(e.cx<=e.px1){e.cx=e.px1;e.dir=1;}if(e.cx>=e.px2){e.cx=e.px2;e.dir=-1;}});
};

Game.prototype.update=function(dt){
  if(dt===undefined)dt=1;
  if(this.done)return;
  var p=this.p;
  if(this.flash>0)this.flash-=dt;
  this.sx*=Math.pow(.65,dt);this.sy*=Math.pow(.65,dt);
  this.updateMovingPlats(dt);this.updateEnemies(dt);

  if(p.dead){
    p.dt+=dt;
    if(p.dt>58){this.deaths++;sfxDeath();this.flipped=false;this.charges=3;this.initP();this.hud();}
    for(var k=0;k<this.pts.length;k++){var pt=this.pts[k];pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vy+=.13*dt;pt.life-=.04*dt;}
    this.pts=this.pts.filter(function(pt){return pt.life>0;});return;
  }

  if(p.coyote>0)p.coyote-=dt;if(p.jbuf>0)p.jbuf-=dt;
  if(jumpBuffer>0){p.jbuf=jumpBuffer;jumpBuffer=0;}

  var sp=6.1*(W/800),accel=p.og?.46:.22,drag=p.og?.42:.9;
  if(held.left){p.vx+=((-sp-p.vx)*accel)*dt;}
  else if(held.right){p.vx+=((sp-p.vx)*accel)*dt;}
  else{p.vx*=Math.pow(drag,dt);}

  var canJump=p.og||p.coyote>0;
  if(held.jump&&!this._prevJump&&canJump){p.vy=-10.8*(H/380);p.coyote=0;p.jbuf=0;sfxJump();}
  if(p.og&&p.jbuf>0){p.vy=-10.8*(H/380);p.jbuf=0;sfxJump();}
  if(!held.jump&&p.vy<-2.6*(H/380))p.vy+=3.3*(H/380)*dt;
  this._prevJump=held.jump;

  p.vy+=.88*(H/380)*dt;
  p.vy=Math.max(-17*(H/380),Math.min(20*(H/380),p.vy));
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  p.x=Math.max(0,Math.min(W-p.w,p.x));

  var wasOnGround=p.og;p.og=false;p.movingVx=0;
  var plats=this.plats();
  for(var i=0;i<plats.length;i++){
    var pl=plats[i];
    if(pl.wall){
      if(p.x+p.w>pl.x&&p.x<pl.x+pl.w&&p.y+p.h>pl.y&&p.y<pl.y+pl.h){
        if(p.vx>0)p.x=pl.x-p.w;else p.x=pl.x+pl.w;p.vx=0;
      }
      continue;
    }
    if(p.x+p.w>pl.x&&p.x<pl.x+pl.w&&p.y+p.h>pl.y&&p.y<pl.y+pl.h){
      var ot=p.y+p.h-pl.y,ob=pl.y+pl.h-p.y,ol=p.x+p.w-pl.x,or2=pl.x+pl.w-p.x;
      var minV=Math.min(ot,ob),minH=Math.min(ol,or2);
      if(minV<minH){
        if(ot<ob){p.y=pl.y-p.h;p.vy=0;p.og=true;if(pl.moving){p.movingVx=pl.vx;p.x+=pl.vx*dt;}}
        else{p.y=pl.y+pl.h;p.vy=0;}
      }else{if(ol<or2){p.x=pl.x-p.w;}else{p.x=pl.x+pl.w;}p.vx=0;}
    }
  }
  if(p.og)p.coyote=4;else if(wasOnGround&&!p.og)p.coyote=4;

  var dc=this.flipped?'#ff6b35':'#00d4ff';
  this.trails.push({x:p.x+p.w/2,y:p.y+p.h/2,life:1,col:dc});
  if(this.trails.length>12)this.trails.shift();
  for(var t=0;t<this.trails.length;t++)this.trails[t].life-=.09*dt;
  this.trails=this.trails.filter(function(tr){return tr.life>0;});

  var hzs=this.hazards();
  for(var h=0;h<hzs.length;h++){var hz=hzs[h];if(p.x+p.w>hz.x+3&&p.x<hz.x+hz.w-3&&p.y+p.h>hz.y+4&&p.y<hz.y+hz.h){this.killPlayer();return;}}
  var ens=this.getEnemies();
  for(var e=0;e<ens.length;e++){var en=ens[e];if(p.x+p.w-4>en.cx&&p.x+4<en.cx+en.w&&p.y+p.h-4>en.y&&p.y+4<en.y+en.h){this.killPlayer();return;}}
  if(p.y>H+60){this.killPlayer();return;}

  var sts=this.getStars();
  for(var si=0;si<sts.length;si++){
    var st=sts[si];if(st.got)continue;
    if(p.x+p.w>st.dx&&p.x<st.dx+st.dw&&p.y+p.h>st.dy&&p.y<st.dy+st.dh){
      this.stars[st.i].got=true;this.charges=Math.min(3,this.charges+1);
      this.burst(st.dx+8,st.dy+8,'#ffe066',14);sfxStar();this.hud();
    }
  }

  var ex=this.getExit();
  var allGot=this.stars.every(function(s){return s.got;});
  var dimOk=ex.req==='any'||(ex.req==='alpha'&&!this.flipped)||(ex.req==='omega'&&this.flipped);
  if(allGot&&dimOk&&p.x+p.w>ex.x&&p.x<ex.x+ex.w&&p.y+p.h>ex.y&&p.y<ex.y+ex.h)this.win();

  for(var pi=0;pi<this.pts.length;pi++){var pp=this.pts[pi];pp.x+=pp.vx*dt;pp.y+=pp.vy*dt;pp.vy+=.13*dt;pp.life-=.04*dt;}
  this.pts=this.pts.filter(function(pp){return pp.life>0;});
};

Game.prototype.killPlayer=function(){
  var p=this.p;if(p.dead)return;
  p.dead=true;p.dt=0;this.burst(p.x+p.w/2,p.y+p.h/2,'#ff4444',28);
  if(cfg.shake){this.sx=10;this.sy=10;}sfxDeath();
};

Game.prototype.win=function(){
  this.done=true;sfxWin();
  var g=this.stars.length;
  if(g>(save.stars[this.idx]||0))save.stars[this.idx]=g;
  var nxt=this.idx+1;
  if(nxt<LEVELS.length&&save.unlocked.indexOf(nxt)===-1)save.unlocked.push(nxt);
  persist();
  var ov=document.getElementById('gameOverlay');ov.classList.remove('hidden');
  document.getElementById('goTitle').textContent='CORE REACHED';
  document.getElementById('goTitle').style.color='var(--green)';
  document.getElementById('goSub').textContent='Stars: '+g+'/'+this.stars.length+'  \u2022  Deaths: '+this.deaths;
  document.getElementById('goStars').innerHTML=Array.from({length:g},function(){return '<div class="go-star lit"></div>';}).join('');
  var btns='';
  if(nxt<LEVELS.length)btns+='<button class="go-btn primary" onclick="launchLevel('+nxt+')">NEXT \u25B6</button>';
  btns+='<button class="go-btn primary" onclick="launchLevel('+this.idx+')">RETRY</button>';
  btns+='<button class="go-btn secondary" onclick="pauseGame()">LEVELS</button>';
  document.getElementById('goBtns').innerHTML=btns;
};

Game.prototype.drawStarShape=function(c,cx,cy,r,col,glow){
  c.save();c.shadowBlur=glow?12:0;c.shadowColor=col;c.fillStyle=col;c.beginPath();
  for(var i=0;i<5;i++){var a=(i/5)*Math.PI*2-Math.PI/2,b=a+Math.PI/5;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.lineTo(Math.cos(b)*r*.38,Math.sin(b)*r*.38);}
  c.closePath();c.fill();c.restore();
};

Game.prototype.drawSpikes=function(c,h,CW){
  var SPIKE_W=16*(CW/800),SPIKE_H=h.h,count=Math.floor(h.w/SPIKE_W);
  c.fillStyle='#ff445588';c.strokeStyle='#ff4455';c.lineWidth=1.5;
  for(var i=0;i<count;i++){var sx=h.x+i*SPIKE_W;c.beginPath();c.moveTo(sx,h.y+SPIKE_H);c.lineTo(sx+SPIKE_W/2,h.y);c.lineTo(sx+SPIKE_W,h.y+SPIKE_H);c.closePath();c.fill();c.stroke();}
};

Game.prototype.drawDrone=function(c,e,CW){
  var cx=e.cx+e.w/2,cy=e.y+e.h/2;
  c.save();c.translate(cx,cy);
  c.fillStyle='#ff6b35cc';c.shadowBlur=8;c.shadowColor='#ff6b35';c.fillRect(-e.w/2,-e.h/2,e.w,e.h);
  c.fillStyle='#ff2200';c.shadowBlur=4;c.shadowColor='#ff0000';c.beginPath();c.arc(0,0,3*(CW/800),0,Math.PI*2);c.fill();
  c.shadowBlur=0;c.strokeStyle='#ff6b3555';c.lineWidth=1;c.beginPath();c.moveTo(-e.w/2-6,0);c.lineTo(e.w/2+6,0);c.stroke();
  c.restore();
};

Game.prototype.drawBgStars=function(c,CW,CH){
  var now=Date.now();
  /* Draw connection lines between nearby stars */
  for(var i=0;i<this.bgStars.length;i++){
    for(var j=i+1;j<this.bgStars.length;j++){
      var a=this.bgStars[i],b=this.bgStars[j];
      var dx=(a.nx-b.nx)*CW,dy=(a.ny-b.ny)*CH;
      var d=Math.sqrt(dx*dx+dy*dy);
      if(d<90){
        c.globalAlpha=(1-d/90)*0.12;
        c.strokeStyle='#5588cc';
        c.lineWidth=0.5;
        c.beginPath();c.moveTo(a.nx*CW,a.ny*CH);c.lineTo(b.nx*CW,b.ny*CH);c.stroke();
      }
    }
  }
  /* Draw star dots with twinkle */
  for(var i=0;i<this.bgStars.length;i++){
    var bs=this.bgStars[i];
    var twinkle=0.4+0.6*Math.sin(now*0.0015+bs.tw);
    c.globalAlpha=bs.a*twinkle;
    c.fillStyle=bs.col;
    c.beginPath();
    c.arc(bs.nx*CW,bs.ny*CH,bs.r*(CW/800),0,Math.PI*2);
    c.fill();
  }
  c.globalAlpha=1;
};

Game.prototype.drawWall=function(c,pl,dc,CW){
  /* Subtle fill */
  c.fillStyle=dc+'0a';
  c.fillRect(pl.x,pl.y,pl.w,pl.h);
  /* Main outline */
  c.strokeStyle=dc+'77';
  c.lineWidth=2;
  c.strokeRect(pl.x,pl.y,pl.w,pl.h);
  /* Inner offset outline */
  c.strokeStyle=dc+'1a';
  c.lineWidth=1;
  c.strokeRect(pl.x+4,pl.y+4,pl.w-8,pl.h-8);
  /* Cross-hatch pattern */
  c.strokeStyle=dc+'12';
  c.lineWidth=0.5;
  for(var yy=pl.y+8;yy<pl.y+pl.h;yy+=8){c.beginPath();c.moveTo(pl.x+2,yy);c.lineTo(pl.x+pl.w-2,yy);c.stroke();}
  for(var xx=pl.x+8;xx<pl.x+pl.w;xx+=8){c.beginPath();c.moveTo(xx,pl.y+2);c.lineTo(xx,pl.y+pl.h-2);c.stroke();}
  /* Corner brackets */
  var cl=Math.min(10,pl.w/3,pl.h/3);
  c.strokeStyle=dc+'cc';
  c.lineWidth=2;
  c.beginPath();c.moveTo(pl.x,pl.y+cl);c.lineTo(pl.x,pl.y);c.lineTo(pl.x+cl,pl.y);c.stroke();
  c.beginPath();c.moveTo(pl.x+pl.w-cl,pl.y);c.lineTo(pl.x+pl.w,pl.y);c.lineTo(pl.x+pl.w,pl.y+cl);c.stroke();
  c.beginPath();c.moveTo(pl.x,pl.y+pl.h-cl);c.lineTo(pl.x,pl.y+pl.h);c.lineTo(pl.x+cl,pl.y+pl.h);c.stroke();
  c.beginPath();c.moveTo(pl.x+pl.w-cl,pl.y+pl.h);c.lineTo(pl.x+pl.w,pl.y+pl.h);c.lineTo(pl.x+pl.w,pl.y+pl.h-cl);c.stroke();
  /* Warning stripe edges */
  c.fillStyle=dc+'18';
  for(var sy=pl.y;sy<pl.y+pl.h;sy+=12){
    if(Math.floor(sy/12)%2===0){
      c.fillRect(pl.x,sy,3,Math.min(6,pl.y+pl.h-sy));
      c.fillRect(pl.x+pl.w-3,sy,3,Math.min(6,pl.y+pl.h-sy));
    }
  }
};

Game.prototype.drawLevel=function(c,CW,CH,dc,useHeldForLegs){
  c.fillStyle='#04040d';c.fillRect(0,0,CW,CH);

  /* Background stars */
  this.drawBgStars(c,CW,CH);

  c.strokeStyle='#ffffff05';c.lineWidth=1;
  var gsx=40*(CW/800),gsy=40*(CH/380);
  for(var gx=0;gx<CW;gx+=gsx){c.beginPath();c.moveTo(gx,0);c.lineTo(gx,CH);c.stroke();}
  for(var gy=0;gy<CH;gy+=gsy){c.beginPath();c.moveTo(0,gy);c.lineTo(CW,gy);c.stroke();}
  c.fillStyle=dc+'07';c.fillRect(0,0,CW,CH);

  if(this.flash>0){var fa=Math.floor(Math.max(0,this.flash)/14*160);c.fillStyle=this.flashCol+(fa<16?'0':'')+fa.toString(16);c.fillRect(0,0,CW,CH);}

  var plats=this.plats();
  for(var i=0;i<plats.length;i++){
    var pl=plats[i];
    if(pl.wall){
      this.drawWall(c,pl,dc,CW);
      continue;
    }
    c.fillStyle='#0e0e20';c.fillRect(pl.x,pl.y,pl.w,pl.h);
    c.strokeStyle=dc+'44';c.lineWidth=.5;c.strokeRect(pl.x,pl.y,pl.w,pl.h);
    c.strokeStyle=dc;c.lineWidth=pl.moving?2.5:2;
    if(pl.moving){var gr=c.createLinearGradient(pl.x,0,pl.x+pl.w,0);var gt=(Date.now()/800)%1;gr.addColorStop(Math.max(0,gt-.2),'transparent');gr.addColorStop(gt,dc);gr.addColorStop(Math.min(1,gt+.2),'transparent');c.strokeStyle=gr;}
    c.beginPath();c.moveTo(pl.x,pl.y);c.lineTo(pl.x+pl.w,pl.y);c.stroke();
    if(pl.moving){c.fillStyle=dc+'22';c.fillRect(pl.x,pl.y,pl.w,pl.h);c.fillStyle=dc+'66';c.font=Math.round(8*(CW/800))+'px Share Tech Mono';c.textAlign='center';c.fillText('\u25B6\u25C0',pl.x+pl.w/2,pl.y+pl.h/2+3);c.textAlign='left';}
  }

  var hzs=this.hazards();for(var h=0;hzs&&h<hzs.length;h++)this.drawSpikes(c,hzs[h],CW);
  var ens=this.getEnemies();for(var e=0;ens&&e<ens.length;e++)this.drawDrone(c,ens[e],CW);

  var ex=this.getExit(),allGot=this.stars.every(function(s){return s.got;});
  var dimOk=ex.req==='any'||(ex.req==='alpha'&&!this.flipped)||(ex.req==='omega'&&this.flipped);
  var exOn=allGot&&dimOk,t=Date.now()/1000;
  c.strokeStyle=exOn?'#00ff88':'#0a3a3a';c.lineWidth=exOn?2.5:1;c.strokeRect(ex.x,ex.y,ex.w,ex.h);
  var pulseA=Math.floor((.1+.05*Math.sin(t*4))*255);var pulseH=pulseA<16?'0':'';
  c.fillStyle=exOn?'#00ff88'+pulseH+pulseA.toString(16):'#09140a';
  c.fillRect(ex.x,ex.y,ex.w,ex.h);
  if(exOn){c.strokeStyle='#00ff8844';c.lineWidth=8+Math.sin(t*3)*3;c.shadowBlur=20;c.shadowColor='#00ff88';c.strokeRect(ex.x,ex.y,ex.w,ex.h);c.shadowBlur=0;}
  c.font='bold '+Math.round(11*(CW/800))+'px "Share Tech Mono"';c.textAlign='center';c.fillStyle=exOn?'#00ff88':'#233423';
  c.fillText('CORE',ex.x+ex.w/2,ex.y+ex.h/2+4);
  var gotCount=this.stars.filter(function(s){return s.got;}).length;
  if(!allGot){c.fillStyle='#2a3f2a';c.font=Math.round(9*(CW/800))+'px "Share Tech Mono"';c.fillText(gotCount+'/'+this.stars.length+'\u2605',ex.x+ex.w/2,ex.y+ex.h/2+15);}
  else if(!dimOk){c.fillStyle='#ff6b35';c.font=Math.round(9*(CW/800))+'px "Share Tech Mono"';c.fillText(ex.req.toUpperCase(),ex.x+ex.w/2,ex.y+ex.h/2+15);}
  c.textAlign='left';

  var sts=this.getStars();
  for(var si=0;si<sts.length;si++){
    var st=sts[si];if(st.got)continue;
    c.save();var bob=Math.sin(Date.now()*.002+st.bob)*2.5;
    c.translate(st.dx+st.dw/2,st.dy+st.dh/2+bob);c.rotate(Date.now()*.0006+st.dx*.01);
    this.drawStarShape(c,0,0,7*(CW/800),'#ffe066',true);c.restore();
  }

  for(var ti=0;ti<this.trails.length;ti++){
    var tr=this.trails[ti],alpha=tr.life*.4,sz=(ti/this.trails.length)*6*(CW/800);
    c.globalAlpha=alpha;c.fillStyle=tr.col;c.fillRect(tr.x-sz/2,tr.y-sz/2,sz,sz);
  }c.globalAlpha=1;

  var p=this.p,inputSrc=useHeldForLegs||held;
  var speedRatio=Math.min(1,Math.abs(p.vx)/(6.1*(CW/800)));
  var moveing=inputSrc.left||inputSrc.right;
  var hop=p.og&&moveing?Math.abs(Math.sin(Date.now()*.024))*Math.max(0,speedRatio*1.5):0;
  var bodyTilt=(inputSrc.left?-1:0)+(inputSrc.right?1:0);
  var walkCycle=Date.now()*.024;
  var legSwing=moveing?Math.sin(walkCycle)*Math.max(2.2,4.4*speedRatio):0;
  var armSwing=moveing?Math.sin(walkCycle+Math.PI)*Math.max(1.1,2.3*speedRatio):0;
  var squash=p.og?1+(moveing?Math.abs(Math.sin(walkCycle))*0.06:0):Math.max(.9,1-Math.min(1,Math.abs(p.vy)/(12*(CH/380)))*0.08);
  var stretch=p.og?1-(moveing?Math.abs(Math.sin(walkCycle))*0.04:0):1+Math.min(1,Math.abs(p.vy)/(12*(CH/380)))*0.06;
  c.save();
  c.translate(p.x+p.w/2,p.y+p.h/2+hop);
  c.rotate(bodyTilt*.025);
  c.scale(squash,stretch);
  c.fillStyle=dc;
  c.shadowColor=dc;
  c.shadowBlur=8;
  c.fillRect(-p.w*.22,-p.h*.68,p.w*.44,p.h*.22);
  c.fillRect(-p.w*.38,-p.h*.48,p.w*.76,p.h*.82);
  c.fillStyle='#e8f7ff';
  c.fillRect(-p.w*.17,-p.h*.42,p.w*.1,p.h*.08);
  c.fillRect(p.w*.07,-p.h*.42,p.w*.1,p.h*.08);
  c.fillStyle=dc+'ee';
  c.fillRect(-p.w*.56,-p.h*.14+armSwing*.1,p.w*.12,p.h*.28);
  c.fillRect(p.w*.44,-p.h*.14-armSwing*.1,p.w*.12,p.h*.28);
  c.shadowBlur=0;
  c.fillStyle=dc+'cc';
  c.fillRect(-p.w*.26,p.h*.18,p.w*.16,p.h*.2+Math.max(0,legSwing*.12));
  c.fillRect(-p.w*.28,p.h*.34+Math.max(0,legSwing*.05),p.w*.14,p.h*.24+Math.max(0,legSwing*.18));
  c.fillRect(p.w*.1,p.h*.18,p.w*.16,p.h*.2+Math.max(0,-legSwing*.12));
  c.fillRect(p.w*.14,p.h*.34+Math.max(0,-legSwing*.05),p.w*.14,p.h*.24+Math.max(0,-legSwing*.18));
  c.restore();

  c.font='bold '+Math.round(9*(CW/800))+'px "Orbitron"';c.fillStyle=dc+'44';c.textAlign='right';
  c.fillText(this.flipped?'\u25BC OMEGA':'\u25B2 ALPHA',CW-10,CH-8);c.textAlign='left';

  if(this.charges===0&&!p.dead){
    c.fillStyle='rgba(255,68,85,'+(.15+.08*Math.sin(Date.now()*.004))+')';
    c.font=Math.round(9*(CW/800))+'px "Share Tech Mono"';c.textAlign='center';
    c.fillText('NO PHASE CHARGES',CW/2,CH-8);c.textAlign='left';
  }
};

Game.prototype.draw=function(){
  var dc=this.flipped?'#ff6b35':'#00d4ff';
  ctx.save();ctx.translate(Math.round(this.sx),Math.round(this.sy));
  this.drawLevel(ctx,W,H,dc);
  ctx.restore();
};

/* ═══════════════════════════════════════════
   HOME BG
═══════════════════════════════════════════ */
var homePts=[],homeRaf=null;
function animateHome(){
  var c=document.getElementById('homeBg'),hw=document.getElementById('home');
  c.width=hw.clientWidth;c.height=hw.clientHeight;var cx=c.getContext('2d');
  if(homePts.length<55)homePts=Array.from({length:55},function(){return {x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-.5)*.38,vy:(Math.random()-.5)*.38,r:Math.random()*1.8+.4,col:Math.random()>.5?'#00d4ff':'#ff6b35'};});
  if(homeRaf)cancelAnimationFrame(homeRaf);
  function fr(){
    if(curScreen!=='home'){homeRaf=null;return;}
    cx.clearRect(0,0,c.width,c.height);
    for(var i=0;i<homePts.length;i++){var pt=homePts[i];pt.x+=pt.vx;pt.y+=pt.vy;if(pt.x<0)pt.x=c.width;if(pt.x>c.width)pt.x=0;if(pt.y<0)pt.y=c.height;if(pt.y>c.height)pt.y=0;cx.beginPath();cx.arc(pt.x,pt.y,pt.r,0,Math.PI*2);cx.fillStyle=pt.col;cx.fill();}
    for(var i=0;i<homePts.length;i++)for(var j=i+1;j<homePts.length;j++){var d=Math.hypot(homePts[i].x-homePts[j].x,homePts[i].y-homePts[j].y);if(d<75){cx.strokeStyle='rgba(80,160,255,'+(1-d/75)*.28+')';cx.lineWidth=.5;cx.beginPath();cx.moveTo(homePts[i].x,homePts[i].y);cx.lineTo(homePts[j].x,homePts[j].y);cx.stroke();}}
    homeRaf=requestAnimationFrame(fr);
  }
  homeRaf=requestAnimationFrame(fr);
}

/* ═══════════════════════════════════════════
   VS LEVEL SELECT
═══════════════════════════════════════════ */
function buildVsGrid(){
  var grid=document.getElementById('vsLsGrid');grid.innerHTML='';
  LEVELS.forEach(function(lv,i){
    var card=document.createElement('div');card.className='level-card';
    var tags=(lv.tags||[]).map(function(t){return '<span class="lc-tag '+t+'">'+t.toUpperCase()+'</span>';}).join(' ');
    card.innerHTML='<div class="lc-num">0'+(i+1)+'</div>'+(tags?'<div style="margin-bottom:4px">'+tags+'</div>':'')+'<div class="lc-name">'+lv.name+'</div><div class="lc-desc">'+lv.desc+'</div><div class="lc-stars">'+Array.from({length:lv.stars.length},function(){return '<div class="sp u"></div>';}).join('')+'</div>';
    card.onclick=function(){launchVsLevel(i);};grid.appendChild(card);
  });
}

/* ═══════════════════════════════════════════
   VS GAME ENGINE
═══════════════════════════════════════════ */
var canvasTop=document.getElementById('gcTop');
var ctxTop=canvasTop.getContext('2d');
var canvasBot=document.getElementById('gcBot');
var ctxBot=canvasBot.getContext('2d');

var VG1=null,VG2=null,vsRaf=null;
var vsWinner=null;
var vsStartTime=0;

var heldP1={left:false,right:false,down:false,jump:false};
var heldP2={left:false,right:false,down:false,jump:false};
var p1JumpBuf=0,p2JumpBuf=0;

function resizeVsCanvas(){
  var topDiv=document.getElementById('vsTop'),botDiv=document.getElementById('vsBot');
  canvasTop.width=topDiv.clientWidth;canvasTop.height=topDiv.clientHeight;
  canvasBot.width=botDiv.clientWidth;canvasBot.height=botDiv.clientHeight;
}

function VsGame(idx,canv,ct,inputHeld,playerNum){
  this.idx=idx;this.lv=LEVELS[idx];this.deaths=0;
  this.pts=[];this.trails=[];this.sx=0;this.sy=0;
  this.flipped=false;this.charges=3;this.flash=0;this.flashCol='#fff';this.done=false;
  this._prevJump=false;
  this._canvas=canv;this._ctx=ct;this._held=inputHeld;this._playerNum=playerNum;
  this._finishTime=null;
  var self=this;
  this.stars=this.lv.stars.map(function(s,i){return {x:s.x,y:s.y,w:16,h:16,got:false,i:i,bob:Math.random()*Math.PI*2};});
  this.movingPlatState=[];this.enemies=[];
  this.bgStars=Array.from({length:25},function(){return {nx:Math.random(),ny:Math.random(),r:Math.random()*1.3+.3,col:Math.random()>.5?'#00d4ff':'#ff6b35',a:Math.random()*.3+.08,tw:Math.random()*Math.PI*2};});
  this.initP();this.vsHud();
}

VsGame.prototype=Object.create(Game.prototype);
VsGame.prototype.constructor=VsGame;

VsGame.prototype.initP=function(){
  if(!this._canvas)return;
  var s=this.lv.start,CW=this._canvas.width,CH=this._canvas.height,sx=CW/800,sy=CH/380;
  this.p={x:s.x*sx,y:s.y*sy,w:22*sx,h:30*sy,vx:0,vy:0,og:false,dead:false,dt:0,coyote:0,jbuf:0,movingVx:0};
  var self=this;
  this.movingPlatState=this.lv.platforms.map(function(p){return p.moving?{x:p.x*(CW/800),dir:1}:null;});
  this.enemies=this.lv.enemies.map(function(e){return {cx:e.x*(CW/800),y:e.y*(CH/380),w:e.w*(CW/800),h:e.h*(CH/380),px1:e.px1*(CW/800),px2:e.px2*(CW/800),speed:e.speed||1.5,dir:1};});
  this.stars=this.lv.stars.map(function(s,i){return {x:s.x,y:s.y,w:16*(CW/800),h:16*(CH/380),got:false,i:i,bob:self.stars[i]?self.stars[i].bob:Math.random()*Math.PI*2};});
};

VsGame.prototype.rawPlats=function(){
  var self=this,CW=this._canvas.width,CH=this._canvas.height;
  return this.lv.platforms.map(function(p,i){
    var mp=self.movingPlatState[i],rx=mp?mp.x:p.x*(CW/800);
    return {x:rx,y:p.y*(CH/380),w:p.w*(CW/800),h:p.h*(CH/380),wall:!!p.wall,moving:!!p.moving,vx:mp?(mp.dir*(p.speed||1)*(CW/800)):0};
  });
};
VsGame.prototype.plats=function(){var r=this.rawPlats(),CH=this._canvas.height;return this.flipped?r.map(function(p){return {x:p.x,y:CH-p.y-p.h,w:p.w,h:p.h,wall:p.wall,moving:p.moving,vx:p.vx};}):r;};

VsGame.prototype.rawHazards=function(){var CW=this._canvas.width,CH=this._canvas.height,self=this;return this.lv.hazards.map(function(h){return {x:h.x*(CW/800),y:h.y*(CH/380),w:h.w*(CW/800),h:h.h*(CH/380)};});};
VsGame.prototype.hazards=function(){var r=this.rawHazards(),CH=this._canvas.height;return this.flipped?r.map(function(h){return {x:h.x,y:CH-h.y-h.h,w:h.w,h:h.h};}):r;};

VsGame.prototype.rawEnemies=function(){var self=this;return this.enemies.map(function(e){return {cx:e.cx,y:e.y,w:e.w,h:e.h,px1:e.px1,px2:e.px2,speed:e.speed,dir:e.dir};});};
VsGame.prototype.getEnemies=function(){var r=this.rawEnemies(),CH=this._canvas.height;return this.flipped?r.map(function(e){return {cx:e.cx,y:CH-e.y-e.h,w:e.w,h:e.h,px1:e.px1,px2:e.px2,speed:e.speed,dir:e.dir};}):r;};

VsGame.prototype.getStars=function(){
  var CW=this._canvas.width,CH=this._canvas.height,self=this;
  return this.stars.map(function(s){
    var dy=self.flipped?CH-s.y*(CH/380)-s.h:s.y*(CH/380);
    return {x:s.x,y:s.y,dx:s.x*(CW/800),dy:dy,dw:s.w,dh:s.h,got:s.got,i:s.i,bob:s.bob};
  });
};

VsGame.prototype.getExit=function(){
  var e=this.lv.exit,CW=this._canvas.width,CH=this._canvas.height;
  var ey=this.flipped?CH-e.y*(CH/380)-e.h*(CH/380):e.y*(CH/380);
  return {x:e.x*(CW/800),y:ey,w:e.w*(CW/800),h:e.h*(CH/380),req:e.req};
};

VsGame.prototype.tryPhase=function(){
  var CH=this._canvas.height;
  if(this.charges<=0||this.p.dead||this.done)return;
  sfxPhase();this.charges--;this.flipped=!this.flipped;
  this.p.y=CH-this.p.y-this.p.h;this.p.vy=0;this.p.vx*=0.5;this.p.og=false;this.p.coyote=0;
  for(var i=0;i<30;i++){
    var stuck=false,plats=this.plats(),p=this.p;
    for(var j=0;j<plats.length;j++){
      var pl=plats[j];if(pl.wall)continue;
      if(p.x+p.w>pl.x&&p.x<pl.x+pl.w&&p.y+p.h>pl.y&&p.y<pl.y+pl.h){
        stuck=true;var ot=p.y+p.h-pl.y,ob=pl.y+pl.h-p.y;
        if(ot<ob)p.y=pl.y-p.h-1;else p.y=pl.y+pl.h+1;break;
      }
    }
    if(!stuck)break;
  }
  this.flash=14;this.flashCol=this.flipped?'#ff6b35':'#00d4ff';
  this.burst(this.p.x+this.p.w/2,this.p.y+this.p.h/2,this.flashCol,30);
  if(cfg.shake){this.sx=11;this.sy=10;}this.vsHud();
};

VsGame.prototype.updateMovingPlats=function(dt){
  var self=this,CW=this._canvas.width;
  this.lv.platforms.forEach(function(p,i){
    if(!p.moving||!self.movingPlatState[i])return;
    var ms=self.movingPlatState[i],spd=(p.speed||1)*(CW/800)*dt;
    ms.x+=ms.dir*spd;var x1=p.mx1*(CW/800),x2=(p.mx2||p.mx1+200)*(CW/800);
    if(ms.x<=x1){ms.x=x1;ms.dir=1;}if(ms.x>=x2){ms.x=x2;ms.dir=-1;}
  });
};

VsGame.prototype.updateEnemies=function(dt){
  var CW=this._canvas.width,self=this;
  this.enemies.forEach(function(e){var spd=e.speed*(CW/800)*dt;e.cx+=e.dir*spd;if(e.cx<=e.px1){e.cx=e.px1;e.dir=1;}if(e.cx>=e.px2){e.cx=e.px2;e.dir=-1;}});
};

VsGame.prototype.update=function(dt){
  if(dt===undefined)dt=1;
  if(this.done)return;
  var CW=this._canvas.width,CH=this._canvas.height,p=this.p;
  if(this.flash>0)this.flash-=dt;
  this.sx*=Math.pow(.65,dt);this.sy*=Math.pow(.65,dt);
  this.updateMovingPlats(dt);this.updateEnemies(dt);

  if(p.dead){
    p.dt+=dt;
    if(p.dt>58){this.deaths++;this.flipped=false;this.charges=3;this.initP();this.vsHud();}
    for(var k=0;k<this.pts.length;k++){var pt=this.pts[k];pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vy+=.13*dt;pt.life-=.04*dt;}
    this.pts=this.pts.filter(function(pt){return pt.life>0;});return;
  }

  var h=this._held;
  if(p.coyote>0)p.coyote-=dt;if(p.jbuf>0)p.jbuf-=dt;
  if(this._playerNum===1&&p1JumpBuf>0){p.jbuf=p1JumpBuf;p1JumpBuf=0;}
  if(this._playerNum===2&&p2JumpBuf>0){p.jbuf=p2JumpBuf;p2JumpBuf=0;}

  var sp=6.1*(CW/800),accel=p.og?.46:.22,drag=p.og?.42:.9;
  if(h.left){p.vx+=((-sp-p.vx)*accel)*dt;}
  else if(h.right){p.vx+=((sp-p.vx)*accel)*dt;}
  else{p.vx*=Math.pow(drag,dt);}

  var canJump=p.og||p.coyote>0;
  if(h.jump&&!this._prevJump&&canJump){p.vy=-10.8*(CH/380);p.coyote=0;p.jbuf=0;sfxJump();}
  if(p.og&&p.jbuf>0){p.vy=-10.8*(CH/380);p.jbuf=0;sfxJump();}
  if(!h.jump&&p.vy<-2.6*(CH/380))p.vy+=3.3*(CH/380)*dt;
  this._prevJump=h.jump;

  p.vy+=.88*(CH/380)*dt;
  p.vy=Math.max(-17*(CH/380),Math.min(20*(CH/380),p.vy));
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  p.x=Math.max(0,Math.min(CW-p.w,p.x));

  var wasOnGround=p.og;p.og=false;p.movingVx=0;
  var plats=this.plats();
  for(var i=0;i<plats.length;i++){
    var pl=plats[i];
    if(pl.wall){if(p.x+p.w>pl.x&&p.x<pl.x+pl.w&&p.y+p.h>pl.y&&p.y<pl.y+pl.h){if(p.vx>0)p.x=pl.x-p.w;else p.x=pl.x+pl.w;p.vx=0;}continue;}
    if(p.x+p.w>pl.x&&p.x<pl.x+pl.w&&p.y+p.h>pl.y&&p.y<pl.y+pl.h){
      var ot=p.y+p.h-pl.y,ob=pl.y+pl.h-p.y,ol=p.x+p.w-pl.x,or2=pl.x+pl.w-p.x;
      var minV=Math.min(ot,ob),minH=Math.min(ol,or2);
      if(minV<minH){if(ot<ob){p.y=pl.y-p.h;p.vy=0;p.og=true;if(pl.moving){p.movingVx=pl.vx;p.x+=pl.vx*dt;}}else{p.y=pl.y+pl.h;p.vy=0;}}
      else{if(ol<or2){p.x=pl.x-p.w;}else{p.x=pl.x+pl.w;}p.vx=0;}
    }
  }
  if(p.og)p.coyote=4;else if(wasOnGround&&!p.og)p.coyote=4;

  var baseCol=this._playerNum===1?'#00d4ff':'#ff6b35';
  var dc=this.flipped?(this._playerNum===1?'#ff6b35':'#00d4ff'):baseCol;
  this.trails.push({x:p.x+p.w/2,y:p.y+p.h/2,life:1,col:dc});
  if(this.trails.length>12)this.trails.shift();
  for(var t=0;t<this.trails.length;t++)this.trails[t].life-=.09*dt;
  this.trails=this.trails.filter(function(tr){return tr.life>0;});

  var hzs=this.hazards();
  for(var hi=0;hzs&&hi<hzs.length;hi++){var hz=hzs[hi];if(p.x+p.w>hz.x+3&&p.x<hz.x+hz.w-3&&p.y+p.h>hz.y+4&&p.y<hz.y+hz.h){this.killPlayer();return;}}
  var ens=this.getEnemies();
  for(var ei=0;ens&&ei<ens.length;ei++){var en=ens[ei];if(p.x+p.w-4>en.cx&&p.x+4<en.cx+en.w&&p.y+p.h-4>en.y&&p.y+4<en.y+en.h){this.killPlayer();return;}}
  if(p.y>CH+60){this.killPlayer();return;}

  var sts=this.getStars();
  for(var si=0;si<sts.length;si++){
    var st=sts[si];if(st.got)continue;
    if(p.x+p.w>st.dx&&p.x<st.dx+st.dw&&p.y+p.h>st.dy&&p.y<st.dy+st.dh){
      this.stars[st.i].got=true;this.charges=Math.min(3,this.charges+1);
      this.burst(st.dx+8,st.dy+8,'#ffe066',14);sfxStar();this.vsHud();
    }
  }

  var ex=this.getExit();
  var allGot=this.stars.every(function(s){return s.got;});
  var dimOk=ex.req==='any'||(ex.req==='alpha'&&!this.flipped)||(ex.req==='omega'&&this.flipped);
  if(allGot&&dimOk&&p.x+p.w>ex.x&&p.x<ex.x+ex.w&&p.y+p.h>ex.y&&p.y<ex.y+ex.h)this.vsWin();

  for(var pi=0;pi<this.pts.length;pi++){var pp=this.pts[pi];pp.x+=pp.vx*dt;pp.y+=pp.vy*dt;pp.vy+=.13*dt;pp.life-=.04*dt;}
  this.pts=this.pts.filter(function(pp){return pp.life>0;});
};

VsGame.prototype.killPlayer=function(){
  var p=this.p;if(p.dead)return;
  p.dead=true;p.dt=0;this.burst(p.x+p.w/2,p.y+p.h/2,'#ff4444',28);
  if(cfg.shake){this.sx=10;this.sy=10;}sfxDeath();
};

VsGame.prototype.vsWin=function(){
  if(this.done)return;
  this.done=true;this._finishTime=((Date.now()-vsStartTime)/1000).toFixed(1);sfxWin();
  var other=this._playerNum===1?VG2:VG1;
  if(other&&other.done){showVsResult();}
  else{vsWinner=this._playerNum;var self=this;setTimeout(function(){if(VG1&&VG2&&(!other||!other.done))showVsResult();},1500);}
};

VsGame.prototype.vsHud=function(){
  var pn=this._playerNum,g=this.stars.filter(function(s){return s.got;}).length;
  var dimEl=document.getElementById('vsHudDim'+pn);
  dimEl.textContent=this.flipped?'\u25BC OMEGA':'\u25B2 ALPHA';
  dimEl.className='vs-dim '+(this.flipped?'omega':'alpha');
  document.getElementById('vsHudStars'+pn).textContent='\u2605 '+g+'/'+this.stars.length;
  var ph='';for(var i=0;i<3;i++)ph+=i<this.charges?'\u25CF':'\u25CB';
  document.getElementById('vsHudPhase'+pn).textContent=ph;
  document.getElementById('vsHudDeaths'+pn).textContent='\u2713 '+this.deaths;
};

VsGame.prototype.draw=function(){
  var c=this._ctx,CW=this._canvas.width,CH=this._canvas.height;
  var baseCol=this._playerNum===1?'#00d4ff':'#ff6b35';
  var dc=this.flipped?(this._playerNum===1?'#ff6b35':'#00d4ff'):baseCol;
  c.save();c.translate(Math.round(this.sx),Math.round(this.sy));
  this.drawLevel(c,CW,CH,dc,this._held);
  if(this.done){
    c.fillStyle='rgba(4,4,13,0.55)';c.fillRect(0,0,CW,CH);
    c.font='bold '+Math.round(14*(CW/800))+'px "Orbitron"';c.textAlign='center';c.fillStyle='#00ff88';
    c.fillText('CORE REACHED!',CW/2,CH/2-8);
    c.font=Math.round(9*(CW/800))+'px "Share Tech Mono"';c.fillStyle='#ffe066';
    c.fillText('TIME: '+this._finishTime+'s',CW/2,CH/2+12);c.textAlign='left';
  }
  c.restore();
};

function showVsResult(){
  if(vsRaf){cancelAnimationFrame(vsRaf);vsRaf=null;}
  var ov=document.getElementById('vsOverlay');ov.classList.remove('hidden');
  var t1=VG1._finishTime,t2=VG2._finishTime;
  var winTitle,winSub,winColor;
  if(t1&&t2){
    var faster=parseFloat(t1)<parseFloat(t2)?1:parseFloat(t2)<parseFloat(t1)?2:0;
    winTitle=faster===0?'\u2694 DRAW!':(faster===1?'P1 WINS!':'P2 WINS!');
    winColor=faster===1?'var(--alpha)':faster===2?'var(--omega)':'#ffe066';
    winSub=faster===0?'Both reached the CORE at the same time!':(faster===1?'P1 faster by '+(parseFloat(t2)-parseFloat(t1)).toFixed(1)+'s':'P2 faster by '+(parseFloat(t1)-parseFloat(t2)).toFixed(1)+'s');
  }else if(t1){winTitle='P1 WINS!';winColor='var(--alpha)';winSub='P1 reached the CORE first!';}
  else if(t2){winTitle='P2 WINS!';winColor='var(--omega)';winSub='P2 reached the CORE first!';}
  else{winTitle='TIME IS UP';winColor='var(--muted)';winSub='Neither player reached the CORE.';}
  document.getElementById('vsWinTitle').textContent=winTitle;
  document.getElementById('vsWinTitle').style.color=winColor;
  document.getElementById('vsWinSub').textContent=winSub;
  document.getElementById('vsScoreTime1').textContent=t1?t1+'s':'DNF';
  document.getElementById('vsScoreTime2').textContent=t2?t2+'s':'DNF';
  document.getElementById('vsScoreDeath1').textContent=VG1?VG1.deaths:'\u2014';
  document.getElementById('vsScoreDeath2').textContent=VG2?VG2.deaths:'\u2014';
  var idx=VG1?VG1.idx:0,nxt=idx+1;
  var btns='';
  if(nxt<LEVELS.length)btns+='<button class="go-btn primary" style="border-color:var(--omega);color:var(--omega);" onclick="launchVsLevel('+nxt+')">NEXT LEVEL \u25B6</button>';
  btns+='<button class="go-btn primary" onclick="launchVsLevel('+idx+')">REMATCH</button>';
  btns+='<button class="go-btn secondary" onclick="pauseVsGame()">LEVEL SELECT</button>';
  document.getElementById('vsWinBtns').innerHTML=btns;
}

function launchVsLevel(idx){
  sfxClick();
  document.getElementById('vsOverlay').classList.add('hidden');
  showScreen('vsScreen');
  setTimeout(function(){
    resizeVsCanvas();vsWinner=null;vsStartTime=Date.now();
    VG1=new VsGame(idx,canvasTop,ctxTop,heldP1,1);
    VG2=new VsGame(idx,canvasBot,ctxBot,heldP2,2);
    document.getElementById('vsHudLvl').textContent='LVL '+(idx+1)+': '+LEVELS[idx].name;
    VG1.vsHud();VG2.vsHud();
    if(vsRaf)cancelAnimationFrame(vsRaf);
    var last=null;
    function loop(ts){
      if(!VG1&&!VG2)return;
      if(last===null)last=ts;var dt=Math.min((ts-last)/16.67,2.5);last=ts;
      if(VG1){VG1.update(dt);VG1.draw();}
      if(VG2){VG2.update(dt);VG2.draw();}
      vsRaf=requestAnimationFrame(loop);
    }
    vsRaf=requestAnimationFrame(loop);
  },60);
}

function pauseVsGame(){
  if(vsRaf){cancelAnimationFrame(vsRaf);vsRaf=null;}
  VG1=null;VG2=null;showScreen('vsLevelSelect');
}

window.addEventListener('resize',function(){
  if(curScreen==='gameScreen'&&G)resizeCanvas();
  if(curScreen==='home')animateHome();
  if(curScreen==='vsScreen'&&VG1&&VG2)resizeVsCanvas();
});

animateHome();


// =====================
// THEME SWITCHER
// =====================
function toggleTheme(){
  document.body.classList.toggle('cyberpunk');

  // save preference
  if(document.body.classList.contains('cyberpunk')){
    localStorage.setItem('theme','cyberpunk');
  }else{
    localStorage.setItem('theme','default');
  }
}

// apply saved theme on load
(function(){
  var saved = localStorage.getItem('theme');
  if(saved === 'cyberpunk'){
    document.body.classList.add('cyberpunk');
  }
})();