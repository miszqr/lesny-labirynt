/* Character categories are shared by game rules and both views. */
(function(root){
 'use strict';
 const CATEGORY=Object.freeze({FRIENDLY:'friendly',ENEMY:'enemy'});
 const categories=Object.freeze({
  [CATEGORY.FRIENDLY]:Object.freeze({label:'Przyjazna',completionHearts:1}),
  [CATEGORY.ENEMY]:Object.freeze({label:'Przeciwnik',completionHearts:0})
 });
 const isFriendly=character=>character?.category===CATEGORY.FRIENDLY;
 const isEnemy=character=>character?.category===CATEGORY.ENEMY;
 const completionHearts=character=>isFriendly(character)?categories[CATEGORY.FRIENDLY].completionHearts:0;
 const api={CATEGORY,categories,isFriendly,isEnemy,completionHearts};root.ForestCharacters=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);
