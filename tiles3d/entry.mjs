// No 3D dependency or WebGL context is loaded in the stable 2D view.
if(new URLSearchParams(location.search).get('view')==='3d') {
  const css=document.createElement('link');css.rel='stylesheet';css.href='tiles3d/style.css';
  try {
    await new Promise((resolve,reject)=>{css.onload=resolve;css.onerror=reject;document.head.append(css)});
    const {createTilesView}=await import('./view.mjs');
    window.enableForestTiles(createTilesView);
  } catch(error) { window.forestTilesFailure(error); }
}
