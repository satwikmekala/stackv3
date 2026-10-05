/* global __dirname */
const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,mocks={}) {
  const exports={};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  new Function('exports','require',code)(exports,id=>mocks[id]??require(id));return exports;
}
const {createWorkoutLaunchCoordinator}=load('features/workout-launch/coordinator.ts');
const intents=[{kind:'empty'},{kind:'stack',archetypes:['push','pull'],variants:['b','c']},{kind:'custom',splitId:7,workoutId:12}];
function harness(confirmed=false,enabled=true) {
  const live={profile:{name:'Keep',weightUnit:'kg',weightUnitConfirmed:confirmed},currentSession:null};
  const starts=[],writes=[],states=[];let saveFailure=false,startFailure=false,afterSave=()=>{};
  const api=createWorkoutLaunchCoordinator({current:()=>live,needsConfirmation:()=>enabled,
    confirmUnit:unit=>{if(saveFailure)throw Error('disk');live.profile={...live.profile,weightUnit:unit,weightUnitConfirmed:true};writes.push(unit);afterSave();},
    start:intent=>{if(startFailure)throw Error('disk');assert.equal(live.profile.weightUnitConfirmed,confirmed||enabled);starts.push(intent);live.currentSession={id:'1',origin:intent.kind};},
    publish:state=>states.push(state),
  });
  return {api,live,starts,writes,states,failSave:v=>{saveFailure=v;},failStart:v=>{startFailure=v;},afterSave:fn=>{afterSave=fn;}};
}
for(const intent of intents){
  test(`${intent.kind}: cancelling first launch creates no session, unit write or timer`,()=>{
    const h=harness();assert.equal(h.api.request(intent).kind,'confirmation');assert.equal(h.api.request(intent).kind,'ignored');
    assert.equal(h.live.currentSession,null);assert.deepEqual(h.writes,[]);assert.deepEqual(h.starts,[]);
    h.api.selectUnit('lbs');h.api.cancel();assert.equal(h.api.getState().intent,null);assert.equal(h.api.confirm().kind,'ignored');
    assert.equal(h.live.profile.weightUnitConfirmed,false);assert.equal(h.api.request(intent).kind,'confirmation');assert.equal(h.api.getState().unit,'kg');
  });
  test(`${intent.kind}: unit save failure blocks creation; retry confirms before exactly one launch`,()=>{
    const h=harness();h.api.request(intent);h.api.selectUnit('lbs');h.failSave(true);
    assert.equal(h.api.confirm().kind,'failed');assert.match(h.api.getState().error,/save your weight unit/);assert.equal(h.starts.length,0);
    h.failSave(false);assert.equal(h.api.confirm().kind,'started');assert.equal(h.api.confirm().kind,'ignored');assert.equal(h.api.request(intent).kind,'ignored');
    assert.deepEqual(h.writes,['lbs']);assert.deepEqual(h.starts,[{...intent,origin:undefined}]);assert.equal(h.live.profile.weightUnit,'lbs');
  });
  test(`${intent.kind}: session failure retains intended workout and confirmed units for Retry`,()=>{
    const h=harness();h.api.request(intent);h.failStart(true);assert.equal(h.api.confirm().kind,'failed');
    assert.match(h.api.getState().error,/start your workout/);assert.equal(h.live.profile.weightUnitConfirmed,true);assert.equal(h.live.currentSession,null);
    h.failStart(false);assert.equal(h.api.confirm().kind,'started');assert.equal(h.writes.length,1);assert.equal(h.starts.length,1);
  });
}
for(const moment of ['before request','while sheet open','after unit save'])test(`${moment}: an existing workout resumes without another creation`,()=>{
  const h=harness();const active={id:'existing'};
  if(moment==='before request')h.live.currentSession=active;
  const result=h.api.request(intents[1]);
  if(moment==='before request')assert.equal(result.kind,'resume');
  else {
    if(moment==='while sheet open')h.live.currentSession=active;else h.afterSave(()=>{h.live.currentSession=active;});
    assert.equal(h.api.confirm().kind,'resume');
  }
  assert.equal(h.live.currentSession,active);assert.equal(h.starts.length,0);assert.equal(h.writes.length,moment==='after unit save'?1:0);
});
test('confirmed users and flag-off users start directly; completed navigation unlocks a later resume',()=>{
  for(const [confirmed,enabled]of [[true,true],[false,false]]){
    const h=harness(confirmed,enabled);assert.equal(h.api.request(intents[0]).kind,'started');assert.equal(h.writes.length,0);
    h.api.resetAfterNavigation();assert.equal(h.api.request(intents[2]).kind,'resume');assert.equal(h.starts.length,1);
  }
});
test('captured Stack variants and custom identities survive mutations outside the sheet',()=>{
  for(const intent of [{kind:'stack',archetypes:['push'],variants:['b'],origin:{x:1,y:2,size:56,color:'#FF7A3D'}},{kind:'custom',splitId:7,workoutId:12}]){
    const h=harness();const original=JSON.parse(JSON.stringify(intent));h.api.request(intent);
    if(intent.kind==='stack'){intent.archetypes[0]='legs';intent.variants[0]='c';intent.origin.x=999;}else {intent.splitId=99;intent.workoutId=999;}
    h.api.confirm();assert.deepEqual(h.starts[0],{...original,origin:original.origin});
  }
});
test('reentrant presses and cancellation during a commit cannot duplicate or cancel launch',()=>{
  const h=harness();h.api.request(intents[0]);h.afterSave(()=>{
    assert.equal(h.api.confirm().kind,'ignored');assert.equal(h.api.request(intents[2]).kind,'ignored');h.api.cancel();assert.ok(h.api.getState().intent);
  });
  assert.equal(h.api.confirm().kind,'started');assert.equal(h.starts.length,1);assert.equal(h.writes.length,1);
});
test('failed direct starts recover without a unit prompt; missing profiles cannot create a workout',()=>{
  const h=harness(true);h.failStart(true);assert.equal(h.api.request(intents[1]).kind,'failed');assert.equal(h.api.getState().intent,null);
  h.failStart(false);assert.equal(h.api.request(intents[1]).kind,'started');assert.equal(h.starts.length,1);
  const missing=harness();missing.live.profile=null;assert.equal(missing.api.request(intents[0]).kind,'failed');assert.equal(missing.starts.length,0);
});
test('unit-sheet launch replaces its route once and avoids reset source geometry; direct launch retains its origin',()=>{
  const events=[],router={push:r=>events.push(['push',r]),replace:r=>events.push(['replace',r])};
  const {navigateWorkoutLaunch}=load('features/workout-launch/navigation.ts',{'@/utils/workoutResume':{resumeWorkout:r=>r.push({pathname:'/workout',params:{fromActivityCard:'1'}})}});
  const origin={x:1,y:2,size:56,color:'#FF7A3D'};
  navigateWorkoutLaunch(router,{kind:'confirmation'});navigateWorkoutLaunch(router,{kind:'started',origin},true);navigateWorkoutLaunch(router,{kind:'ignored'},true);
  navigateWorkoutLaunch(router,{kind:'resume'},true);navigateWorkoutLaunch(router,{kind:'started',origin});
  assert.deepEqual(events,[['push','/workout-unit'],['replace',{pathname:'/workout',params:{}}],['replace',{pathname:'/workout',params:{fromActivityCard:'1'}}],['push',{pathname:'/workout',params:{launchOrigin:JSON.stringify(origin)}}]]);
});
