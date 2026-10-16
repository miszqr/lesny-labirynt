(function(root){
function generate(n,random=Math.random){
 const cells=Array.from({length:n*n},(_,id)=>({id,links:[]})),start=(n-1)*n,seen=new Set([start]),stack=[start];
 while(stack.length){const a=stack[stack.length-1],x=a%n,y=Math.floor(a/n);const opts=[y>0?a-n:-1,x<n-1?a+1:-1,y<n-1?a+n:-1,x>0?a-1:-1].filter(b=>b>=0&&!seen.has(b));if(!opts.length){stack.pop();continue}const b=opts[Math.floor(random()*opts.length)];cells[a].links.push(b);cells[b].links.push(a);seen.add(b);stack.push(b)}
 const dist=Array(n*n).fill(-1),q=[start];dist[start]=0;for(let i=0;i<q.length;i++)for(const b of cells[q[i]].links)if(dist[b]<0){dist[b]=dist[q[i]]+1;q.push(b)}
 const exit=dist.indexOf(Math.max(...dist));
 const path=[exit];while(path[0]!==start){const a=path[0];path.unshift(cells[a].links.find(b=>dist[b]===dist[a]-1))}
 const cut=3+Math.floor(random()*(path.length-4)),gate=[path[cut-1],path[cut]];
 const before=new Set([start]),todo=[start];for(let i=0;i<todo.length;i++)for(const b of cells[todo[i]].links){const a=todo[i];if((a===gate[0]&&b===gate[1])||(a===gate[1]&&b===gate[0]))continue;if(!before.has(b)){before.add(b);todo.push(b)}}
 const candidates=[...before].filter(i=>i!==start&&i!==gate[0]);
 const keeper=candidates[Math.floor(random()*candidates.length)];
 const rest=q.filter(i=>i!==start&&i!==exit&&i!==keeper&&i!==gate[0]&&i!==gate[1]);const places=[keeper];while(places.length<3){const at=Math.floor(random()*rest.length);places.push(rest.splice(at,1)[0])}
 return{n,cells,start,exit,places,gate,keeper};
}root.generateMaze=generate;if(typeof module!=='undefined')module.exports={generateMaze:generate};
})(typeof window!=='undefined'?window:globalThis);
