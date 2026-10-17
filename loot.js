/* Item instances are owned by exactly one chest, the backpack, or a completed request. */
(function(root){
 'use strict';
 const CAPACITY=2;
 function reachable(maze,open=false){
  const seen=new Set([maze.start]),queue=[maze.start];
  for(let i=0;i<queue.length;i++)for(const next of maze.cells[queue[i]].links){
   if(!open&&maze.gate.includes(queue[i])&&maze.gate.includes(next))continue;
   if(!seen.has(next)){seen.add(next);queue.push(next)}
  }
  return seen;
 }
 function create({maze,requests,spots,typeIds,random=Math.random}){
  const before=reachable(maze),pool=spots.filter(s=>before.has(s.cell));
  if(!pool.length)throw Error('Brak miejsca na dostępną skrzynkę.');
  const shuffle=values=>{const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
  // Start with a chest on the starting clearing whenever possible, then spread the others.
  const first=pool.find(s=>s.cell===maze.start)||pool[0];
  const selected=[first,...shuffle(pool.filter(s=>s!==first)).slice(0,Math.ceil(maze.n/2)-1)];
  const earlyCount=selected.length;
  selected.push(...shuffle(spots.filter(s=>!before.has(s.cell))).slice(0,1));
  const state={items:{},chests:selected.map((s,i)=>({id:'chest-'+i,cell:s.cell,position:{...s.position},itemIds:[]})),inventoryItemIds:[],consumedItemIds:[],completedRequestIds:[],unlockedGateIds:[],requests:requests.map(r=>({...r})),keyIds:[]};
  let serial=0;
  const add=(chest,typeId)=>{const id='item-'+serial++;state.items[id]={id,typeId};chest.itemIds.push(id)};
  // Reserve one early instance for EVERY request, including optional animals with the same type.
  // Spending in any order therefore cannot starve the key keeper.
  shuffle(requests).forEach((request,i)=>add(state.chests[i%earlyCount],request.requiredTypeId));
  for(const chest of state.chests){
   const types=new Set(chest.itemIds.map(id=>state.items[id].typeId));
   for(const typeId of shuffle(typeIds.filter(id=>!types.has(id))).slice(0,Math.max(0,3-types.size)))add(chest,typeId);
  }
  const verdict=validate(maze,state);
  if(!verdict.ok)throw Error('Nieprzechodnia mapa: '+verdict.reason);
  return state;
 }
 function take(state,chestId,itemId){
  const chest=state.chests.find(c=>c.id===chestId),index=chest?.itemIds.indexOf(itemId)??-1;
  if(state.inventoryItemIds.length>=CAPACITY||index<0||!state.items[itemId]||state.inventoryItemIds.includes(itemId)||state.consumedItemIds.includes(itemId))return false;
  chest.itemIds.splice(index,1);state.inventoryItemIds.push(itemId);return true;
 }
 function putBack(state,chestId,itemId){
  const chest=state.chests.find(c=>c.id===chestId),index=state.inventoryItemIds.indexOf(itemId);
  if(!chest||index<0||!state.items[itemId]||chest.itemIds.includes(itemId)||state.consumedItemIds.includes(itemId))return false;
  state.inventoryItemIds.splice(index,1);chest.itemIds.push(itemId);return true;
 }
 function count(state,typeId){return state.inventoryItemIds.filter(id=>state.items[id].typeId===typeId).length}
 function deliver(state,requestId){
  const request=state.requests.find(r=>r.id===requestId);
  if(!request||state.completedRequestIds.includes(requestId))return null;
  const index=state.inventoryItemIds.findIndex(id=>state.items[id].typeId===request.requiredTypeId);
  if(index<0)return null;
  const [itemId]=state.inventoryItemIds.splice(index,1);
  state.consumedItemIds.push(itemId);state.completedRequestIds.push(requestId);
  if(request.rewardId&&!state.keyIds.includes(request.rewardId))state.keyIds.push(request.rewardId);
  return {itemId,rewardId:request.rewardId};
 }
 function unlock(state,gateId,keyId){
  if(!state.keyIds.includes(keyId)||state.unlockedGateIds.includes(gateId))return false;
  state.unlockedGateIds.push(gateId);return true;
 }
 function invariant(state){
  const locations=[...state.chests.flatMap(c=>c.itemIds),...state.inventoryItemIds,...state.consumedItemIds];
  return state.inventoryItemIds.length<=CAPACITY&&locations.length===Object.keys(state.items).length&&new Set(locations).size===locations.length&&locations.every(id=>state.items[id]?.id===id)&&new Set(state.completedRequestIds).size===state.completedRequestIds.length&&state.completedRequestIds.every(id=>state.requests.some(r=>r.id===id));
 }
 function validate(maze,state){
  if(!invariant(state))return {ok:false,reason:'Nieprawidłowe właścicielstwo przedmiotów.'};
  if(state.inventoryItemIds.length||state.consumedItemIds.length||state.completedRequestIds.length)return {ok:false,reason:'Walidacja wymaga świeżej mapy.'};
  if(!state.requests.some(r=>r.cell===maze.keeper&&r.rewardId==='forest-key'))return {ok:false,reason:'Brak zadania dającego klucz.'};
  if(state.chests.some(c=>!maze.cells[c.cell]||!Number.isFinite(c.position.x)||!Number.isFinite(c.position.z)))return {ok:false,reason:'Niedostępna skrzynka.'};
  const memo=new Map();let states=0;
  function visit(completed){
   const signature=[...completed].sort().join('|');if(memo.has(signature))return memo.get(signature);states++;
   const open=state.requests.some(r=>completed.has(r.id)&&r.rewardId==='forest-key');
   // Reachable stock includes chests, not one oversized inventory. Each request
   // needs one item; free returns and permanently open gates allow repeated trips.
   const area=reachable(maze,open),stock={};
   for(const c of state.chests)if(area.has(c.cell))for(const id of c.itemIds){const type=state.items[id].typeId;stock[type]=(stock[type]||0)+1}
   for(const r of state.requests)if(completed.has(r.id))stock[r.requiredTypeId]=(stock[r.requiredTypeId]||0)-1;
   const next=state.requests.filter(r=>!completed.has(r.id)&&area.has(r.cell)&&stock[r.requiredTypeId]>0);
   // All legal delivery orders must finish, not only the first successful sequence.
   const ok=next.length?next.every(r=>visit(new Set([...completed,r.id]))):area.has(maze.exit)&&completed.size===state.requests.length;
   memo.set(signature,ok);return ok;
  }
  const ok=visit(new Set());return {ok,states,reason:ok?'':'Brak przedmiotów dla jednej z kolejności zadań.'};
 }
 const api={CAPACITY,reachable,create,take,putBack,count,deliver,unlock,invariant,validate};root.ForestLoot=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
