/* First-person forest view. The maze graph remains the source of movement rules. */
(function (root) {
  'use strict';
  const {isFriendly,isEnemy}=typeof module==='object'&&module.exports?require('./characters.js'):root.ForestCharacters;
  const vectors = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function neighbor(maze, cell, direction) {
    const [dx, dy] = vectors[direction], x = cell % maze.n + dx, y = Math.floor(cell / maze.n) + dy;
    return x < 0 || y < 0 || x >= maze.n || y >= maze.n ? -1 : y * maze.n + x;
  }
  function isGate(maze, a, b) {
    return a !== b && maze.gate.includes(a) && maze.gate.includes(b);
  }
  function corridor(maze, pos, facing, gateOpen) {
    const cells = [];
    for (let depth = 0, cell = pos; depth < 5; depth++) {
      const links = maze.cells[cell].links;
      const ahead = neighbor(maze, cell, facing);
      const left = neighbor(maze, cell, (facing + 3) % 4);
      const right = neighbor(maze, cell, (facing + 1) % 4);
      const frontGate = links.includes(ahead) && isGate(maze, cell, ahead);
      cells.push({ cell, depth, ahead, left, right, frontGate,
        front: links.includes(ahead), leftOpen: links.includes(left), rightOpen: links.includes(right),
        leftGate: links.includes(left) && isGate(maze, cell, left),
        rightGate: links.includes(right) && isGate(maze, cell, right) });
      if (!links.includes(ahead) || (frontGate && !gateOpen)) break;
      cell = ahead;
    }
    return cells;
  }
  const CAMERA=Object.freeze({focal:220,horizon:152,eyeHeight:1.08,near:.08,far:9});
  const scaleAt=z=>CAMERA.focal/Math.max(.16,z+.65);
  function project(x,z,height=0){const scale=scaleAt(z);return [320+scale*x,CAMERA.horizon+scale*(CAMERA.eyeHeight-height)]}
  function worldToView({maze,pos,facing}, x, y) {
    const dx=x-pos%maze.n*2,dy=y-Math.floor(pos/maze.n)*2;
    const forward=vectors[facing],right=vectors[(facing+1)%4];
    return [dx*right[0]+dy*right[1],dx*forward[0]+dy*forward[1]];
  }
  function animalWorldPose(maze,cell) {
    // The same fixed offsets as on the map; all animals face west, toward the path.
    return {x:cell%maze.n*2+13/30,y:Math.floor(cell/maze.n)*2+11/30,heading:3};
  }
  function animalPose(state,cell) {
    const world=animalWorldPose(state.maze,cell),[side,depth]=worldToView(state,world.x,world.y);
    const dx=state.pos%state.maze.n*2-world.x,dy=Math.floor(state.pos/state.maze.n)*2-world.y;
    const distance=Math.hypot(dx,dy),forward=vectors[world.heading],right=vectors[(world.heading+1)%4];
    const front=(dx*forward[0]+dy*forward[1])/distance,flank=dx*right[0]+dy*right[1];
    // The visible side depends on the observer's location, never the camera's yaw.
    const view=front>.6?'front':front<-.6?'back':flank>0?'right':'left';
    const [x,y]=project(side,depth),scale=scaleAt(depth)*.024;
    const visible=depth>.04&&Math.abs(side)<depth*(320/CAMERA.focal)+.24;
    return {world,side,depth,x,y,scale,view,visible};
  }
  function chestPose(state,chest){
    const world={x:(chest.position.x-30)/30,y:(chest.position.z-30)/30};
    const [side,depth]=worldToView(state,world.x,world.y),[x,y]=project(side,depth,.4);
    return {world,side,depth,x,y,visible:depth>.04&&Math.abs(side)<(depth+.65)*320/CAMERA.focal+.3};
  }
  const number = n => Number(n.toFixed(2));
  const points = vertices => vertices.map(v => project(...v).map(number).join(',')).join(' ');
  const polygon = (vertices, fill, extra = '') => `<polygon points="${points(vertices)}" fill="${fill}" ${extra}/>`;
  function compass(facing) {
    const name=['północ','wschód','południe','zachód'][facing];
    return `<g transform="translate(16 16)" role="img" aria-label="Kompas: ${name}">
      <circle cx="36" cy="36" r="35" fill="#fffdf2" fill-opacity=".95" stroke="#8b9e78" stroke-width="1.5"/>
      <circle cx="36" cy="36" r="23" fill="none" stroke="#dbe2ce"/>
      <g fill="#405b45" font-family="Arial,sans-serif" font-size="10" font-weight="bold" text-anchor="middle"><text x="36" y="12">Pn</text><text x="63" y="40">W</text><text x="36" y="68">Pd</text><text x="9" y="40">Z</text></g>
      <g data-compass-facing="${facing}" transform="rotate(${facing*90} 36 36)"><path d="M36 17L43 36H29Z" fill="#ba5143"/><path d="M36 55L29 36H43Z" fill="#809681"/></g>
      <circle cx="36" cy="36" r="3" fill="#fffdf2" stroke="#526d53"/>
    </g>`;
  }
  function minimap({maze,pos,facing,gateOpen,visited=new Set([pos]),reveal=false,chests=[]}) {
    const size=maze.n*12+12,visible=id=>reveal||visited.has(id),point=id=>[12+(id%maze.n)*12,12+Math.floor(id/maze.n)*12];
    let svg=`<g data-fpv-minimap="true" transform="translate(528 16) scale(${96/size})" role="img" aria-label="Mała mapa: twoja pozycja i odkryte ścieżki. Północ u góry.">
      <rect x=".75" y=".75" width="${size-1.5}" height="${size-1.5}" rx="8" fill="#fffdf2" fill-opacity=".95" stroke="#8b9e78" stroke-width="1.5"/>`;
    for(const cell of maze.cells){
      const [x,y]=point(cell.id);
      if(!visible(cell.id)){svg+=`<circle cx="${x}" cy="${y}" r=".75" fill="#cdd5bf"/>`;continue}
      svg+=`<rect data-minimap-cell="${cell.id}" x="${x-5}" y="${y-5}" width="10" height="10" rx="2" fill="#e1e9d5"/>`;
    }
    for(const cell of maze.cells)if(visible(cell.id)){
      const [x,y]=point(cell.id);
      for(const next of cell.links){
        if(visible(next)&&next<cell.id)continue;
        const [nx,ny]=point(next),end=visible(next)?[nx,ny]:[(x+nx)/2,(y+ny)/2];
        svg+=`<path d="M${x} ${y}L${end[0]} ${end[1]}" stroke="#708767" stroke-width="2.5" stroke-linecap="round"/>`;
      }
    }
    const [a,b]=maze.gate;
    if(visible(a)||visible(b)){
      const [ax,ay]=point(a),[bx,by]=point(b),x=(ax+bx)/2,y=(ay+by)/2;
      svg+=`<path d="${ax===bx?`M${x-3} ${y}h6`:`M${x} ${y-3}v6`}" stroke="${gateOpen?'#9ab380':'#c48b40'}" stroke-width="2" stroke-linecap="round"/>`;
    }
    if(visible(maze.exit)){
      const [x,y]=point(maze.exit);
      svg+=`<path d="M${x-3} ${y}l3-3 3 3v3h-6Z" fill="#bb7651"/>`;
    }
    for(const chest of chests)if(visible(chest.cell)){
      const [x,y]=point(chest.cell);svg+=`<rect x="${x+1}" y="${y-4}" width="4" height="3" rx=".7" fill="${chest.itemIds.length?'#b78039':'#b6b99e'}"/>`;
    }
    const [x,y]=point(pos);
    svg+=`<g data-minimap-player="${pos}" transform="translate(${x} ${y}) rotate(${facing*90})"><path d="M0-5L4 4 0 2-4 4Z" fill="#bb5143" stroke="#fffdf2" stroke-width="1.2" stroke-linejoin="round"/></g></g>`;
    return svg;
  }
  function render(state, art) {
    const {maze,pos,facing,gateOpen,encounters,done,landscape=[]}=state;
    const rooms=corridor(maze,pos,facing,gateOpen),sprites=[];
    let out=`<defs>
      <linearGradient id="fpv-sky" x2="0" y2="1"><stop stop-color="#acd6db"/><stop offset="1" stop-color="#edf0cf"/></linearGradient>
      <linearGradient id="fpv-grass" gradientUnits="userSpaceOnUse" x1="0" y1="152" x2="0" y2="460"><stop stop-color="#c1cea1"/><stop offset=".45" stop-color="#a8bd83"/><stop offset="1" stop-color="#8da66b"/></linearGradient>
      <linearGradient id="fpv-path" gradientUnits="userSpaceOnUse" x1="0" y1="152" x2="0" y2="460"><stop stop-color="#eee0b4"/><stop offset="1" stop-color="#d9c18a"/></linearGradient>
      <filter id="fpv-path-soft" filterUnits="userSpaceOnUse" x="-24" y="-24" width="688" height="508" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="2.5"/></filter>
      <clipPath id="fpv-frame"><rect width="640" height="460" rx="22"/></clipPath>
    </defs><g clip-path="url(#fpv-frame)" data-fpv-fov="${number(2*Math.atan(320/CAMERA.focal)*180/Math.PI)}">
      <rect width="640" height="460" fill="url(#fpv-sky)"/>
      <path d="M0 ${CAMERA.horizon}H640V460H0Z" fill="url(#fpv-grass)"/>`;
    const local=([x,y,h=0])=>[...worldToView(state,(x-30)/30,(y-30)/30),h];
    const inView=(side,depth,radius=0)=>depth+radius>CAMERA.near&&depth-radius<CAMERA.far&&Math.abs(side)<(Math.max(0,depth)+.65)*320/CAMERA.focal+radius;
    const fade=depth=>Math.max(.35,1-Math.max(0,depth-5)*.14);
    const tag=t=>`data-landmark="${t.id}" data-world-x="${(t.x-30)/30}" data-world-y="${(t.y-30)/30}" data-variant="${t.variant}"`;
    function clip(vertices){
      let result=vertices;
      for(const [limit,sign] of [[CAMERA.near,1],[CAMERA.far,-1]]){
        const clipped=[];
        for(let i=0;i<result.length;i++){
          const a=result[i],b=result[(i+1)%result.length],insideA=(a[1]-limit)*sign>=0,insideB=(b[1]-limit)*sign>=0;
          if(insideA)clipped.push(a);
          if(insideA!==insideB){const t=(limit-a[1])/(b[1]-a[1]);clipped.push(a.map((n,k)=>n+(b[k]-n)*t))}
        }
        result=clipped;
      }
      return result;
    }
    function surface(vertices,fill,extra=''){
      const clipped=clip(vertices);return clipped.length>=3?polygon(clipped,fill,extra):'';
    }
    const groundShape=(points,fill,extra='')=>surface(points.map(p=>local(p)),fill,extra);
    function solid(vertices,fill,extra=''){
      const clipped=clip(vertices);if(clipped.length<3)return;
      const depth=clipped.reduce((sum,p)=>sum+p[1],0)/clipped.length;
      sprites.push({depth,svg:polygon(clipped,fill,extra)});
    }
    const visibleLand=landscape.map(t=>({t,p:local([t.x,t.y])})).filter(({t,p})=>inView(p[0],p[1],t.type==='tree'?.65:1.1)).sort((a,b)=>b.p[1]-a.p[1]);
    // Ground features share exact map footprints; only their projection changes.
    for(const {t,p} of visibleLand){
      if(t.type==='tree'||t.type==='hill')continue;
      const v=t.variant,r=t.type==='water'?14+v*5:17+v*5;
      let ground='';
      if(t.type==='water'){
        ground+=groundShape(art.blobOutline(t.x,t.y,r+3,v),'#bfc99b');
        ground+=groundShape(art.blobOutline(t.x,t.y,r,v),v>.5?'#7db9bd':'#8ec4bf');
        ground+=groundShape(art.blobOutline(t.x+2,t.y+1,r*.6,v),'#66aab5','opacity=".35"');
        for(const [dx,dy,length] of [[-8,-3,11],[-4,6,10]]){
          const wave=Array.from({length:9},(_,i)=>local([t.x+dx+length*i/8,t.y+dy-Math.sin(i/8*Math.PI)*1.3,.01]));
          if(wave.every(q=>q[1]>CAMERA.near))ground+=`<polyline points="${points(wave)}" fill="none" stroke="#d4eee0" stroke-width="1.5" stroke-linecap="round"/>`;
        }
      }else ground+=groundShape(art.blobOutline(t.x,t.y,r,v),t.type==='forest'?'#8ea972':'#c1cd95','opacity=".6"');
      out+=`<g ${tag(t)} data-scenery="${t.type}" opacity="${number(fade(p[1]))}">${ground}</g>`;
    }
    let roads='',pebbles='';
    for(const cell of maze.cells){
      const [side,depth]=worldToView(state,cell.id%maze.n*2,Math.floor(cell.id/maze.n)*2);
      if(!inView(side,depth,1.5)&&cell.id!==pos)continue;
      let road='';
      for(const next of cell.links){
        road+=groundShape(art.roadStrip(cell.id,next,0,2.2),'url(#fpv-path)');
        const curve=art.roadCurve(cell.id,next);
        for(const t of [.3,.7]){
          const p=art.roadPoint(curve,t),q=local([p[0]+(art.noise(cell.id*19+next+t)-.5)*3,p[1]]);
          if(!inView(q[0],q[1])||q[1]<CAMERA.near)continue;
          const [sx,sy]=project(...q),r=scaleAt(q[1])*.016;
          pebbles+=`<ellipse cx="${number(sx)}" cy="${number(sy)}" rx="${number(r*1.5)}" ry="${number(r*.4)}" fill="#b89c6c" opacity=".4"/>`;
        }
      }
      roads+=`<g data-fpv-cell="${cell.id}" opacity="${number(fade(depth))}">${road}</g>`;
    }
    out+=`<g data-scenery="soft-path" filter="url(#fpv-path-soft)">${roads}</g>${pebbles}`;
    for(const {t,p} of visibleLand){
      const opacity=fade(p[1]);
      if(t.type==='tree'){
        if(p[1]<=CAMERA.near)continue;
        const [x,y]=project(...p),scale=scaleAt(p[1])*.055*t.scale;
        sprites.push({depth:p[1],svg:`<g ${tag(t)} data-scenery="tree" opacity="${number(opacity)}">${art.treeSprite(x,y,t.variant,scale).svg}</g>`});
      }else if(t.type==='hill'){
        const radius=24*(.82+t.variant*.18),height=.52+t.variant*.2,steps=24;
        const ring=(r,h)=>Array.from({length:steps},(_,i)=>{const angle=i*Math.PI*2/steps;return local([t.x+Math.cos(angle)*radius*r,t.y+Math.sin(angle)*radius*r*.82,h])});
        const rings=[ring(1,0),ring(.72,height*.58),ring(.32,height*.92),ring(0,height)];
        const shades=Array.from({length:steps},(_,i)=>{const light=(1+Math.cos(i*Math.PI*2/steps-2.5))/2;return `rgb(${[118,148,84].map((n,k)=>Math.round(n+([185,205,139][k]-n)*light)).join(',')})`});
        for(let band=0;band<3;band++)for(let i=0;i<steps;i++){
          const j=(i+1)%steps,vertices=[rings[band][i],rings[band][j],rings[band+1][j],rings[band+1][i]];
          solid(vertices,shades[i],`${tag(t)} data-scenery="hill" opacity="${number(opacity)}" stroke="${shades[i]}" stroke-width=".45" stroke-linejoin="round"`);
        }
        // The little stone belongs to the same hill in every viewing direction.
        const stone=local([t.x+13,t.y+10,height*.5+.03]);
        if(stone[1]>CAMERA.near){const [x,y]=project(...stone),s=scaleAt(stone[1])*.035;sprites.push({depth:stone[1],svg:`<g transform="translate(${number(x)} ${number(y)}) scale(${number(s)})" opacity="${number(opacity)}"><path d="M-4 0L-3-3 1-4 4 0 2 2H-3Z" fill="#a6a68b"/><path d="M-4 0L-3-3 1-4 0 1Z" fill="#d1ccb0"/></g>`})}
      }
    }
    // A world-space wicket uses the map's exact edge anchor and opening direction.
    const [ga,gb]=maze.gate,[gx,gy]=art.edgePoint(ga,gb),horizontal=Math.abs(ga-gb)===1;
    const gatePoint=([u,v,h])=>local([gx+(horizontal?v:u),gy+(horizontal?u:v),h/30]);
    const leaf=([u,v,h])=>gateOpen?[-13+v,-u,h]:[u-13,v,h];
    const wood=(u,v,h,w,d,t,transform=p=>p)=>{
      const face=(vertices,color)=>solid(vertices.map(transform).map(gatePoint),color,`data-fpv-gate="${gateOpen?'open':'closed'}" stroke="#795638" stroke-width=".35" stroke-linejoin="round"`);
      face([[u,v,h],[u+w,v,h],[u+w,v,h+t],[u,v,h+t]],'#c28e53');
      face([[u+w,v,h],[u+w,v+d,h],[u+w,v+d,h+t],[u+w,v,h+t]],'#805735');
      face([[u,v+d,h],[u+w,v+d,h],[u+w,v+d,h+t],[u,v+d,h+t]],'#a77543');
      face([[u,v,h],[u,v+d,h],[u,v+d,h+t],[u,v,h+t]],'#94673d');
      face([[u,v,h+t],[u+w,v,h+t],[u+w,v+d,h+t],[u,v+d,h+t]],'#e4b879');
    };
    const gp=local([gx,gy]);
    if(inView(gp[0],gp[1],1.1)){
      for(const u of [-16,16]){wood(u-2,-2,0,4,4,29);wood(u-2.7,-2.7,29,5.4,5.4,2)}
      wood(0,-1,7,26,2,3,leaf);wood(0,-1,19,26,2,3,leaf);
      for(const u of [1,6.5,12,17.5,23])wood(u,0,3,3,1.8,23,leaf);
      solid([[1,2,6],[3,2,5],[25,2,21],[23,2,22]].map(leaf).map(gatePoint),'#e0ad6e',`data-fpv-gate="${gateOpen?'open':'closed'}"`);
      if(!gateOpen){const p=gatePoint(leaf([23,4,17]));if(p[1]>CAMERA.near){const [x,y]=project(...p),s=scaleAt(p[1])*.04;sprites.push({depth:p[1]-.01,svg:`<g transform="translate(${number(x)} ${number(y)}) scale(${number(s)})"><path d="M-1-1V-2.4a1.2 1.2 0 0 1 2.4 0V-1" fill="none" stroke="#fff0b2" stroke-width=".7"/><rect x="-1.6" y="-1" width="3.6" height="3" rx=".5" fill="#e8b64d"/></g>`})}}
    }
    // Chests are small world-space boxes: their position and orientation never follow the camera.
    for(const chest of state.chests||[]){
      const p=chestPose(state,chest);if(!inView(p.side,p.depth,.6))continue;
      const {x,z}=chest.position,empty=!chest.itemIds.length;
      const at=([dx,dz,h])=>local([x+dx,z+dz,h/30]);
      const face=(vertices,color)=>solid(vertices.map(at),color,`data-chest-part="${chest.id}" stroke="#775430" stroke-width=".55" stroke-linejoin="round"`);
      function box(x0,z0,h,w,d,height,top='#e6b66d'){
        face([[x0,z0,h],[x0+w,z0,h],[x0+w,z0,h+height],[x0,z0,h+height]],'#b78346');
        face([[x0+w,z0,h],[x0+w,z0+d,h],[x0+w,z0+d,h+height],[x0+w,z0,h+height]],'#8f6134');
        face([[x0+w,z0+d,h],[x0,z0+d,h],[x0,z0+d,h+height],[x0+w,z0+d,h+height]],'#c48f4d');
        face([[x0,z0+d,h],[x0,z0,h],[x0,z0,h+height],[x0,z0+d,h+height]],'#a37440');
        face([[x0,z0,h+height],[x0+w,z0,h+height],[x0+w,z0+d,h+height],[x0,z0+d,h+height]],top);
      }
      box(-8,-6,0,16,12,9,empty?'#5e4830':'#d6a25c');
      if(empty)box(-8,-6,9,16,2,10);
      else{box(-8.5,-6.5,9,17,13,4);box(-5,-6.8,.3,1.5,13.6,13.2,'#f2d08b');box(4,-6.8,.3,1.5,13.6,13.2,'#f2d08b');box(-1.7,6.6,6,3.4,.7,4,'#f6da91')}
      if(p.visible){
        const [sx,sy]=project(p.side,p.depth),scale=scaleAt(p.depth)/30;
        sprites.push({depth:p.depth,svg:`<g data-chest="${chest.id}" data-empty="${empty}" data-world-x="${p.world.x}" data-world-y="${p.world.y}" transform="translate(${number(sx)} ${number(sy)})"><rect x="${number(-10*scale)}" y="${number(-(empty?19:14)*scale)}" width="${number(20*scale)}" height="${number((empty?19:14)*scale)}" fill="transparent" pointer-events="none"/></g>`});
      }
    }
    // Keep encounter visibility and gate blocking rules while sorting actors with the landscape.
    for(const room of rooms){
      if(room.cell===maze.exit){
        const [side,depth]=worldToView(state,room.cell%maze.n*2,Math.floor(room.cell/maze.n)*2);
        if(inView(side,depth)&&depth>CAMERA.near){const [x,y]=project(side,depth),s=scaleAt(depth)*.025;sprites.push({depth,svg:`<g data-fpv-home="true" transform="translate(${number(x)} ${number(y)}) scale(${number(s)})"><rect x="-24" y="-37" width="48" height="37" rx="2" fill="#efd9a5"/><path d="M-31-35L0-59 31-35Z" fill="#b96846"/><rect x="-6" y="-22" width="12" height="22" rx="2" fill="#886143"/><rect x="12" y="-27" width="9" height="10" fill="#a1d7d0"/></g>`})}
      }else if(encounters[room.cell]&&(isFriendly(encounters[room.cell])||!done.has(room.cell)||state.fleeingCell===room.cell)){
        const e=encounters[room.cell],p=animalPose(state,room.cell);
        if(p.visible)sprites.push({depth:p.depth,svg:`<g data-encounter="${room.cell}" data-category="${e.category}" data-world-x="${p.world.x}" data-world-y="${p.world.y}" data-world-heading="${p.world.heading}" data-animal-view="${p.view}" data-wolf="${isEnemy(e)}" data-character="${room.depth===0?'animal':'distant-animal'}" transform="translate(${number(p.x)} ${number(p.y)}) scale(${number(p.scale)})">${art.characterArt(e.icon,p.view)}${done.has(room.cell)&&isFriendly(e)?'<circle cx="16" cy="-48" r="6" fill="#fff8da"/><path d="M13-48l2 2 4-5" fill="none" stroke="#5b8650" stroke-width="2"/>':''}</g>`});
      }
    }
    sprites.sort((a,b)=>b.depth-a.depth);
    out+=sprites.map(s=>`<g data-fpv-depth="${number(s.depth)}">${s.svg}</g>`).join('');
    out+=compass(facing)+minimap(state)+'</g>';
    return out;
  }
  const api = { CAMERA, project, scaleAt, neighbor, isGate, corridor, worldToView, animalWorldPose, animalPose, chestPose, render };
  root.ForestFPV = api;
  if(typeof module==='object'&&module.exports) module.exports=api;
})(typeof window==='object'?window:globalThis);
