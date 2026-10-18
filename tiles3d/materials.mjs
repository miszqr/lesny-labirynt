import {StandardMaterial,MaterialPluginBase,Material,Color3} from './vendor/babylon.mjs';

export class ForestFog extends MaterialPluginBase {
  constructor(material,texture,size,kind){
    super(material,'ForestFog',200,{FOREST_FOG:true,FOREST_GROUND:false,FOREST_CLIP:false});
    this.texture=texture;this.size=size;this.kind=kind;this._enable(true);
  }
  getClassName(){return 'ForestFog'}
  prepareDefines(defines){
    defines.FOREST_FOG=true;defines.FOREST_GROUND=this.kind==='ground';
    defines.FOREST_CLIP=['ground','road','water','shadow'].includes(this.kind);
  }
  getSamplers(samplers){samplers.push('revealMap')}
  getUniforms(){return {ubo:[{name:'forestSize',size:1,type:'float'}],fragment:'uniform float forestSize;'}}
  bindForSubMesh(buffer){buffer.updateFloat('forestSize',this.size.value);buffer.setTexture('revealMap',this.texture)}
  getCustomCode(shaderType){
    return shaderType==='fragment'?{
      CUSTOM_FRAGMENT_DEFINITIONS:'uniform sampler2D revealMap;',
      CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR:`
        vec2 forestUV = vPositionW.xz / forestSize;
        #ifdef FOREST_CLIP
          if(forestUV.x < 0.0 || forestUV.y < 0.0 || forestUV.x > 1.0 || forestUV.y > 1.0) discard;
        #endif
        forestUV = clamp(forestUV, vec2(0.0), vec2(1.0));
        float seen = texture2D(revealMap, vec2(forestUV.x, 1.0-forestUV.y)).r;
        #ifdef FOREST_GROUND
          color.rgb = mix(vec3(0.77,0.82,0.70), color.rgb, seen);
        #else
          color.a *= seen;
          if(color.a < 0.025) discard;
        #endif
      `
    }:null;
  }
}

export function createForestMaterial(scene,color,kind,texture,size,onError){
  const material=new StandardMaterial(`forest-${kind}-${color}`,scene);
  material.diffuseColor=Color3.FromHexString(color);material.specularColor=Color3.Black();
  material.backFaceCulling=false;material.twoSidedLighting=true;
  material.alpha=kind==='shadow'?.18:1;
  material.transparencyMode=kind==='ground'?Material.MATERIAL_OPAQUE:Material.MATERIAL_ALPHABLEND;
  material.disableDepthWrite=kind==='shadow';
  // Fog adds alpha to solid objects; keep normal depth occlusion (Adam/gate/trees).
  material.forceDepthWrite=kind!=='shadow';
  material.onError=(_effect,message)=>onError?.(new Error(message));
  new ForestFog(material,texture,size,kind);
  return material;
}
