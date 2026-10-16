/* First-person forest view. The maze graph remains the source of movement rules. */
(function (root) {
  'use strict';
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
  function project(x, z, height = 0) {
    const depth = Math.max(.16, z + .65);
    return [320 + 280 * x / depth, 145 + 280 * (.85 - height) / depth];
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
  function minimap({maze,pos,facing,gateOpen,visited=new Set([pos]),reveal=false}) {
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
    const [x,y]=point(pos);
    svg+=`<g data-minimap-player="${pos}" transform="translate(${x} ${y}) rotate(${facing*90})"><path d="M0-5L4 4 0 2-4 4Z" fill="#bb5143" stroke="#fffdf2" stroke-width="1.2" stroke-linejoin="round"/></g></g>`;
    return svg;
  }
  function render(state, art) {
    const { maze, pos, facing, gateOpen, encounters, done } = state;
    const rooms = corridor(maze, pos, facing, gateOpen);
    let out = `<defs>
      <linearGradient id="fpv-sky" x2="0" y2="1"><stop stop-color="#b4dedc"/><stop offset="1" stop-color="#eef1cd"/></linearGradient>
      <linearGradient id="fpv-grass" x2="0" y2="1"><stop stop-color="#91b17c"/><stop offset="1" stop-color="#4d7957"/></linearGradient>
      <linearGradient id="fpv-path" x2="0" y2="1"><stop stop-color="#e4d6a5"/><stop offset="1" stop-color="#d4b781"/></linearGradient>
      <clipPath id="fpv-frame"><rect width="640" height="460" rx="22"/></clipPath>
    </defs><g clip-path="url(#fpv-frame)">
      <rect width="640" height="460" fill="url(#fpv-sky)"/>
      <circle cx="480" cy="66" r="32" fill="#fff5c4" opacity=".8"/>
      <path d="M0 157Q76 103 155 145T320 133T485 141T640 119V230H0Z" fill="#91b49a"/>
      <path d="M0 178Q87 127 170 167T340 158T495 162T640 148V240H0Z" fill="#759c7e"/>
      <path d="M0 186H640V460H0Z" fill="url(#fpv-grass)"/>`;

    function tree(x, z, variant, scale = 1) {
      const [sx, sy] = project(x, z);
      return art.treeSprite(sx, sy, variant, 280 / (z + .65) * .045 * scale).svg;
    }
    function hedge(ax, az, bx, bz, seed) {
      let svg = polygon([[ax,az,0],[bx,bz,0],[bx,bz,.82],[ax,az,.82]], '#50784e');
      // A low leafy barrier plus tall trees makes blocked passages unambiguous.
      for (let i = 0; i < 6; i++) {
        const t = (i + .5) / 6, x = ax + (bx-ax)*t, z = az + (bz-az)*t;
        const [sx, sy] = project(x, z, .63), scale = 280/(z+.65);
        svg += `<ellipse cx="${number(sx)}" cy="${number(sy)}" rx="${number(scale*.25)}" ry="${number(scale*.25)}" fill="${i%2?'#6e985b':'#7da462'}"/>`;
      }
      for (const t of [.15, .65]) {
        const x=ax+(bx-ax)*t, z=az+(bz-az)*t;
        svg += tree(x,z,art.noise(seed+t*9),.9);
      }
      return svg;
    }
    function gate(ax, az, bx, bz) {
      const interpolate = (t,h) => [ax+(bx-ax)*t,az+(bz-az)*t,h];
      const rail = (a,b,h,width,color) => {
        const [x1,y1]=project(...interpolate(a,h)), [x2,y2]=project(...interpolate(b,h));
        return `<path d="M${number(x1)} ${number(y1)}L${number(x2)} ${number(y2)}" stroke="${color}" stroke-width="${number(width)}" stroke-linecap="round"/>`;
      };
      let svg='<g data-fpv-gate="'+(gateOpen?'open':'closed')+'">';
      for(const t of [0,1]) {
        const p=interpolate(t,0), q=interpolate(t,1.16);
        const [x,y]=project(...p),[tx,ty]=project(...q);
        svg+=`<path d="M${number(x)} ${number(y)}L${number(tx)} ${number(ty)}" stroke="#765337" stroke-width="${number(280/(p[1]+.65)*.09)}" stroke-linecap="round"/>`;
      }
      const end=gateOpen?.17:.96, start=.04;
      const width=280/((az+bz)/2+.65)*.055;
      for(let i=0;i<7;i++) {
        const t=start+(end-start)*i/6;
        const [x,y]=project(...interpolate(t,.14)),[tx,ty]=project(...interpolate(t,.97));
        svg+=`<path d="M${number(x)} ${number(y)}L${number(tx)} ${number(ty)}" stroke="#ba8b50" stroke-width="${number(width)}" stroke-linecap="round"/>`;
      }
      svg+=rail(start,end,.33,width,'#93653e')+rail(start,end,.77,width,'#d0a36a');
      if(!gateOpen) {
        const [x,y]=project(...interpolate(.52,.6)), s=280/((az+bz)/2+.65)*.045;
        svg+=`<g transform="translate(${number(x)} ${number(y)}) scale(${number(s)})"><path d="M-1-1V-2.4a1.2 1.2 0 0 1 2.4 0V-1" fill="none" stroke="#fff0b2" stroke-width=".7"/><rect x="-1.6" y="-1" width="3.6" height="3" rx=".5" fill="#e8b64d"/><circle cx=".2" cy=".3" r=".35" fill="#74522d"/></g>`;
      }
      return svg+'</g>';
    }
    // Draw floors first, then depth-sorted barriers and inhabitants.
    for (const room of [...rooms].reverse()) {
      const near=Math.max(.06,room.depth*2-1),far=room.depth*2+1;
      out+=polygon([[-1,near,0],[1,near,0],[1,far,0],[-1,far,0]],'url(#fpv-path)');
      for (const side of [-1,1]) if(side<0?room.leftOpen:room.rightOpen) {
        out+=polygon([[side,near,0],[side*3,near,0],[side*3,far,0],[side,far,0]],'#dfc897');
      }
      for(let i=0;i<5;i++) {
        const z=near+(far-near)*(i+.5)/5,x=(art.noise(room.cell*19+i)-.5)*1.4;
        const [sx,sy]=project(x,z),r=280/(z+.65)*.022;
        out+=`<ellipse cx="${number(sx)}" cy="${number(sy)}" rx="${number(r*1.5)}" ry="${number(r*.4)}" fill="#b89c6c" opacity=".5"/>`;
      }
    }
    for(const room of [...rooms].reverse()) {
      const near=Math.max(.08,room.depth*2-1),far=room.depth*2+1;
      out+=`<g data-fpv-cell="${room.cell}">`;
      if(!room.front) out+=hedge(-1,far,1,far,room.cell+81);
      // Far-to-near sides: openings have a distant hedge, never a fake route through walls.
      for(const side of [-1,1]) {
        const open=side<0?room.leftOpen:room.rightOpen;
        if(open) {
          out+=hedge(side*3,far,side*3,near+.1,room.cell+side*7);
          out+=hedge(side,far,side*3,far,room.cell+side*13);
        } else out+=hedge(side,far,side,near,room.cell+side*7);
        if(side<0?room.leftGate:room.rightGate) out+=gate(side,near+.04,side,far-.04);
      }
      if(room.frontGate) out+=gate(-.95,far,.95,far);
      if(room.cell===maze.exit) {
        const [x,y]=project(0,room.depth*2+.4),s=280/(room.depth*2+1.05)*.025;
        out+=`<g data-fpv-home="true" transform="translate(${number(x)} ${number(y)}) scale(${number(s)})"><rect x="-24" y="-37" width="48" height="37" rx="2" fill="#efd9a5"/><path d="M-31-35L0-59 31-35Z" fill="#b96846"/><rect x="-6" y="-22" width="12" height="22" rx="2" fill="#886143"/><rect x="12" y="-27" width="9" height="10" fill="#a1d7d0"/><path d="M16.5-27V-17M12-22H21" stroke="#fff0ca" stroke-width="1.5"/></g>`;
      } else if(encounters[room.cell]) {
        const e=encounters[room.cell],z=room.depth*2+.55,[x,y]=project(.1,z),s=280/(z+.65)*.024;
        out+=`<g data-character="${room.depth===0?'animal':'distant-animal'}" transform="translate(${number(x)} ${number(y)}) scale(${number(s)})">${art.characterArt(e.icon)}${done.has(room.cell)?'<circle cx="16" cy="-48" r="6" fill="#fff8da"/><path d="M13-48l2 2 4-5" fill="none" stroke="#5b8650" stroke-width="2"/>':''}</g>`;
      }
      out+='</g>';
    }
    // Foreground leaves frame the view without obscuring its center.
    out+='<path d="M0 0H100Q65 20 72 47 37 29 24 65 13 32 0 52Z" fill="#386a49"/><path d="M640 0H546Q584 26 570 46 607 31 617 68 628 36 640 53Z" fill="#497d4e"/>';
    out+='<path d="M0 440Q39 415 75 460H0ZM640 438Q607 414 567 460H640Z" fill="#315e43"/>';
    out+=compass(facing)+minimap(state)+'</g>';
    return out;
  }
  const api = { neighbor, isGate, corridor, render };
  root.ForestFPV = api;
  if(typeof module==='object'&&module.exports) module.exports=api;
})(typeof window==='object'?window:globalThis);
