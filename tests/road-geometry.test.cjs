const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

test('straight stretches and bends join tangentially at clearings and gate midpoints', () => {
  for (const size of [4, 6, 8]) {
    const { run } = game({ size, seed: 42 });
    const report = run(`(() => {
      let corners=0;const errors=[];
      const parallel=(a,b)=>Math.abs(a[0]*b[1]-a[1]*b[0])<1e-8&&a[0]*b[0]+a[1]*b[1]<0;
      const tangent=c=>[c[1][0]-c[0][0],c[1][1]-c[0][1]];
      for(const c of maze.cells){
        if(c.links.length===2){
          const a=roadCurve(c.id,c.links[0]),b=roadCurve(c.id,c.links[1]);
          if(!parallel(tangent(a),tangent(b)))errors.push('clearing '+c.id);
          if(Math.abs(c.links[0]-c.id)!==Math.abs(c.links[1]-c.id))corners++;
        }
        for(const next of c.links){
          const a=roadCurve(c.id,next),b=roadCurve(next,c.id);
          if(JSON.stringify(a[3])!==JSON.stringify(b[3]))errors.push('gap');
          if(!parallel([a[3][0]-a[2][0],a[3][1]-a[2][1]],[b[3][0]-b[2][0],b[3][1]-b[2][1]]))errors.push('edge kink');
        }
      }
      return {corners,errors};
    })()`);
    assert(report.corners > 0);
    assert.equal(report.errors.length, 0, report.errors.join(', '));
  }
});

test('variable widths meet without jumps, stay bounded, and never create another passage', () => {
  for (const size of [4, 6, 8]) {
    const { run } = game({ size, seed: 73 });
    const result = run(`(() => {
      const widths=[],errors=[];
      for(const c of maze.cells)for(const b of c.links){
        if(roadHalfWidth(c.id,b,1)!==roadHalfWidth(b,c.id,1))errors.push('seam');
        for(const other of c.links)if(roadHalfWidth(c.id,b,0)!==roadHalfWidth(c.id,other,0))errors.push('junction');
        for(let i=0;i<=16;i++)widths.push(roadHalfWidth(c.id,b,i/16));
        const ax=c.id%maze.n*60+30,ay=Math.floor(c.id/maze.n)*60+30,bx=b%maze.n*60+30,by=Math.floor(b/maze.n)*60+30;
        for(const [x,y] of roadStrip(c.id,b,3.5)){
          if(!Number.isFinite(x)||!Number.isFinite(y)||x<Math.min(ax,bx)-24||x>Math.max(ax,bx)+24||y<Math.min(ay,by)-24||y>Math.max(ay,by)+24)errors.push('off corridor');
        }
      }
      return {min:Math.min(...widths),max:Math.max(...widths),errors};
    })()`);
    assert.equal(result.errors.length, 0, result.errors.join(', '));
    assert(result.min > 2.5 && result.max < 8);
    assert(result.max - result.min > 2);
  }
});

test('walking follows the same route in reverse and crosses exactly at the gate', () => {
  const { run } = game({ seed: 42 });
  const errors = run(`(() => {
    encounters={};const errors=[];
    for(const c of maze.cells)for(const b of c.links){
      const gate=edgePoint(c.id,b),middle=walkPose(c.id,b,.5);
      if(Math.hypot(middle.x-gate[0],middle.y-12-gate[1])>1e-8)errors.push('missed midpoint');
      for(let i=0;i<=20;i++){
        const a=walkPose(c.id,b,i/20),r=walkPose(b,c.id,1-i/20);
        if(Math.hypot(a.x-r.x,a.y-r.y)>1e-8)errors.push('different reverse route');
      }
    }
    return errors;
  })()`);
  assert.equal(errors.length, 0, errors.join(', '));
});
