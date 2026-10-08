/* global __dirname */
// Execute production screen/component render functions and event handlers with
// mocked native primitives. This verifies branching/handlers, not device layout.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');

function uiHarness(entry, state, params = {}, catalog = [], exerciseInfo = null, musclePreferences = {}, display = {}) {
  let cursor = 0, dirty = false;
  const hooks = [], setters = [], effects = [], cleanups = [], events = [], cache = new Map();
  let launchApi, launchState={intent:null,unit:'kg',busy:false,error:null};
  const listeners={};
  const focusEffects=new Map(), focusCleanups=new Map(), reactions=new Map();
  let focused=true;
  const focusEffect=fn=>{const i=cursor++;if(focusEffects.get(i)!==fn){focusEffects.set(i,fn);effects.push(()=>{focusCleanups.get(i)?.();if(focused)focusCleanups.set(i,fn());});}};
  const navigation={setOptions:options=>events.push(['navigationOptions',options]),addListener:(name,fn)=>{listeners[name]=fn;return ()=>{delete listeners[name];};}};
  const router={back:()=>events.push(['back']),push:x=>events.push(['push',x]),replace:x=>events.push(['replace',x]),dismissTo:x=>events.push(['dismissTo',x]),setParams:x=>Object.assign(params,x),canGoBack:()=>true};
  const chain = new Proxy(function () { return chain; }, { get: () => chain });
  const element = (type, props, ...children) => ({ type, props: { ...props, children } });
  const react = {
    createElement: element, Fragment: 'Fragment',
    useState(initial) { const i=cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial;
      setters[i] ??= value => { const next=typeof value==='function'?value(hooks[i]):value; if(next!==hooks[i]) {hooks[i]=next;dirty=true;} };
      return [hooks[i], setters[i]]; },
    useRef(value) { const i=cursor++; return hooks[i] ?? (hooks[i]={current:value}); },
    useMemo(fn,deps) { const i=cursor++; if(!hooks[i] || deps?.some((v,j)=>v!==hooks[i].deps[j]))hooks[i]={deps,value:fn()};return hooks[i].value; },
    useCallback(fn,deps) { return react.useMemo(()=>fn,deps); },
    useId() { return 'id'; },
    Children: { toArray: children => [children].flat(Infinity).filter(child => child != null && typeof child !== 'boolean') },
    useContext() { return display.departure ?? null; },
    useEffect(fn,deps) { const i=cursor++; if(!hooks[i] || deps?.some((v,j)=>v!==hooks[i][j])) { hooks[i]=deps;effects.push(()=>{cleanups[i]?.();cleanups[i]=fn();}); } },
  };
  state.getExerciseWorkoutType ??= name => catalog.find(exercise => exercise.name === name)?.workoutType ?? null;
  const store=fn=>fn(state);store.getState=()=>state;
  const native = new Proxy({
    Keyboard:{dismiss:()=>events.push(['keyboardDismiss'])},
    Platform:{OS:display.platform ?? 'web'}, Alert:{alert:(...args)=>events.push(['alert',...args])},
    AccessibilityInfo:{isScreenReaderEnabled:async()=>false,addEventListener:()=>({remove(){}})},
    BackHandler:{addEventListener:()=>({remove(){}})},
    AppState:{addEventListener:()=>({remove(){}})},
    useWindowDimensions:()=>({width:390,height:844,fontScale:display.fontScale ?? 1}),
    StyleSheet:{create:x=>x}, Animated:{Value:class {setValue(){}},timing:chain,spring:chain,View:'Animated.View'},
    PanResponder:{create:()=>({panHandlers:{}})},
  },{get:(o,k)=>o[k]??String(k)});
  const reanimated = new Proxy({__esModule:true,default:{View:'Animated.View',ScrollView:'Animated.ScrollView',createAnimatedComponent:x=>x},
    useSharedValue:x=>{const i=cursor++;return hooks[i]??(hooks[i]={value:x,get(){return this.value;},set(next){this.value=typeof next==='function'?next(this.value):next;}});},
    useAnimatedReaction:(prepare,react)=>{reactions.set(cursor++,{prepare,react});},useAnimatedStyle:fn=>fn(),cancelAnimation:x=>events.push(['cancelAnimation',x]),interpolate:()=>0,withTiming:x=>x,withDelay:(_delay,x)=>x,withSpring:(x,config)=>{events.push(['spring',x,config]);return x;},useReducedMotion:()=>false,
  },{get:(o,k)=>o[k]??chain});
  function load(id) {
    if (id==='react') return {...react,default:react,__esModule:true};
    if (id==='react-native') return native;
    if (id==='react-native-reanimated') return reanimated;
    if (id==='react-native-gesture-handler') return {Gesture:{Pan:()=>chain},GestureDetector:'GestureDetector'};
    if ((id==='expo-haptics' || id==='@/services/haptics')) return {selectionAsync:()=>Promise.resolve(),impactAsync:()=>Promise.resolve(),notificationAsync:()=>Promise.resolve(),ImpactFeedbackStyle:{},NotificationFeedbackType:{}};
    if (id==='expo-router') return {Redirect:'Redirect',Stack:{Screen:'Stack.Screen'},useLocalSearchParams:()=>params,useFocusEffect:focusEffect,useNavigation:()=>navigation,useRouter:()=>router};
    if (id==='react-native-safe-area-context') return {useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})};
    if (id==='@/store/muscleColors') return {useMuscleColors: selector => selector({preferences:musclePreferences,hydrated:true,saving:false,error:null})};
    if (id==='@/store/workoutStore') return {useWorkoutStore:store,toLocalCalendarDate:load('@/store/workoutCalendar').toLocalCalendarDate};
    if (id==='@/store/workoutLaunch') {
      launchApi ??= load('@/features/workout-launch/coordinator').createWorkoutLaunchCoordinator({current:()=>state,needsConfirmation:()=>Boolean(display.preview),
        confirmUnit:unit=>state.confirmWorkoutWeightUnit(unit),start:intent=>{
          if(intent.kind==='empty')state.startEmptyWorkout();else if(intent.kind==='custom')state.startWorkoutFromCustomWorkout(intent.splitId,intent.workoutId);else state.startWorkoutFromArchetype(intent.archetypes,intent.variants);
        },publish:next=>{launchState=next;dirty=true;}});
      if(display.intent && !display.intentLoaded){display.intentLoaded=true;launchApi.request(display.intent);}
      return {workoutLaunch:launchApi,useWorkoutLaunch:selector=>selector?selector(launchState):launchState};
    }
    if (id==='@/features/report/shareWorkoutReport') return {shareWorkoutReportPdf:report=>state.shareWorkoutReportPdf(report)};
    if (id==='@/store/workoutDatabase') return {readExerciseNotesSync:exerciseId=>state.notes?.[exerciseId]??[],readExerciseCatalogSync:()=>catalog,getNextArchetypeVariant:()=> 'a',readArchetypeTemplateSync:()=>catalog};
    if (id==='@/store/weeklyQueueEngine') return {getWeeklyQueueState:()=>state.queueState ?? {nextUp:[],nextUpDate:null}};
    if (id==='@/components/home/HomeDeparture') return {HomeDeparture:{Provider:'Provider'},useHomeDepartureStyle:()=>({})};
    if (id==='@/constants/exerciseInfo') return {getExerciseInfo:()=>exerciseInfo};
    if (id==='@/features/onboarding/config') return {ONBOARDING_PREVIEW_ENABLED:Boolean(display.preview)};
    if (id==='@/hooks/usePressScale') return {usePressScale:()=>({})};
    if (id==='@/hooks/useExerciseTimer') return {useExerciseTimer:()=>state.timerView??({timer:null,running:false,elapsedS:0})};
    if (id==='@/store/exerciseTimer') return {
      startExerciseTimer:target=>{events.push(['timerStart',target]);return true;},
      stopExerciseTimer:target=>{events.push(['timerStop',target]);return state.timerStopResult??true;},
      resetExerciseTimer:target=>{events.push(['timerReset',target]);return true;},
      clearExerciseTimer:target=>events.push(['timerClear',target]),
    };
    if (id==='@/components/BonusSet' && id!==entry) return new Proxy({BONUS_SET_META:{extra:{color:'#aaa'},dropset:{color:'#aaa'},pr:{color:'#aaa'}}},{get:(o,k)=>o[k]??String(k)});
    if (id.startsWith('@/components/') && id!==entry) return new Proxy({},{get:(_,k)=>String(k)});
    if (id==='@/store/customSplitDraft') return {getWorkoutLetter:index=>String.fromCharCode(65+index),CUSTOM_SPLIT_MUSCLE_GROUPS:['Chest','Biceps'],getMuscleGroupForExercise:e=>e.primaryMuscle,getWorkoutTypeForMuscleGroup:g=>g==='Chest'?'chest':'arms'};
    if(id.endsWith('.css'))return {};
    if (!id.startsWith('@/') && !id.startsWith('.')) return new Proxy({},{get:(_,k)=>String(k)});
    const file=path.join(root,id.replace(/^@\//,'').replace(/^\.\.\//,''));
    const resolved=['.tsx','.ts'].map(ext=>file+ext).find(f=>fs.existsSync(f));
    if(cache.has(resolved))return cache.get(resolved);
    const exports={};cache.set(resolved,exports);
    const source=fs.readFileSync(resolved,'utf8') + (id==='@/app/(tabs)/index' ? '\nexports.testHomeContent = HomeContent;' : id==='@/components/home/WorkoutIntensityPicker' ? '\nexports.testFeedbackContent = FeedbackContent;' : '');
    const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
    new Function('exports','require','React','__DEV__',code)(exports,child=>load(child.startsWith('.')? '@/'+path.relative(root,path.resolve(path.dirname(resolved),child)):child),react,false);
    return exports;
  }
  load('@/constants/muscleColors').applyMuscleColorPreferences(musclePreferences);
  const module=load(entry);
  const component=display.component ? module[display.component] : module.testHomeContent ?? Object.values(module).find(v=>typeof v==='function');
  return {events,reactions,blur(){focused=false;focusCleanups.forEach(fn=>fn?.());focusCleanups.clear();},focus(){focused=true;focusEffects.forEach((fn,i)=>focusCleanups.set(i,fn()));},launch:()=>launchApi,beforeRemove(){let prevented=false;listeners.beforeRemove?.({preventDefault(){prevented=true;}});return prevented;},unmount(){cleanups.forEach(cleanup=>cleanup?.());focusCleanups.forEach(cleanup=>cleanup?.());},render(props={}) {let tree;for(let i=0;i<5;i++){cursor=0;dirty=false;tree=component(props);while(effects.length)effects.shift()();if(!dirty)break;}return tree;}};
}
function nodes(tree) { if(!tree || typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)]; }
const find=(tree,type)=>nodes(tree).find(n=>n.type===type || n.type?.name===type);
const textOf=tree=>JSON.stringify(tree,(_key,value)=>typeof value==='function'?value.name:value);
function stateFor(exercises=[]) {
  return {currentSession:{id:'7',origin:'adhoc',date:'2026-10-02',workoutTypes:exercises.length?['chest']:[],exercises,completed:false},
    sessions:[],profile:{weightUnit:'kg',weightIncrement:0.5,weightIncrementLbs:5},workoutFocus:null,selectedSet:null,
    getSetEditTarget:()=>null,discardWorkout(){this.currentSession=null;},setWorkoutExerciseIndex(){},
  };
}
const exercise=()=>({name:'Bench Press',metric:'reps',loadType:'external_weight',entryUnit:'kg',sets:[{reps:8,weight:20,completed:true}]});

test('Chest color reaches the logger controls even within a mixed-muscle workout', () => {
  const lift = exercise(); lift.sets[0].completed = false;
  const state = stateFor([lift]);
  Object.assign(state.currentSession, { origin: 'custom_split', workoutTypes: ['legs', 'chest'], archetype: null });
  const h = uiHarness('@/app/workout', state, {}, [{ name: 'Bench Press', workoutType: 'chest' }], null, { chest: 'purple' });
  const tree = h.render();
  assert.equal(find(tree, 'ActiveSetCard').props.accent, '#A76FF2');
  assert.equal(find(tree, 'SwapExerciseSheet').props.accent, '#A76FF2');
});

test('Full Body finish feedback keeps the session identity when legs is the first muscle and final exercise', () => {
  const lift = { ...exercise(), name: 'Calf Raises' };
  for (const params of [{}, { finishFromActivity: '7' }]) {
    const state = stateFor([lift]);
    Object.assign(state.currentSession, {
      origin: 'archetype', archetype: 'full_body', secondaryArchetype: null,
      workoutTypes: ['legs', 'chest', 'back', 'shoulders'],
    });
    const h = uiHarness('@/app/workout', state, params,
      [{ name: lift.name, workoutType: 'legs' }], null, { legs: 'purple' });
    let tree = h.render();
    if (!params.finishFromActivity) {
      find(tree, 'ExerciseFinisher').props.onAdvance();
      tree = h.render();
    }
    const picker = find(tree, 'WorkoutIntensityPicker');
    assert.equal(picker.props.visible, true);
    assert.equal(picker.props.workoutLabel, 'Full Body');
    assert.equal(picker.props.accent, '#FF7A3D');
    assert.equal(picker.props.prompt, 'How did this workout feel?');
    const renderedPicker = uiHarness('@/components/home/WorkoutIntensityPicker', {}, {}, [], null, {}, { component: 'testFeedbackContent' }).render(picker.props);
    assert.ok(textOf(renderedPicker).includes('Full Body'));
    assert.ok(!textOf(renderedPicker).includes('LEGS DAY'));
    assert.ok(nodes(renderedPicker).some(n => n.props?.style?.some?.(style => style?.backgroundColor === '#FF7A3D')));
  }
});

test('Workout feedback lets the user change their rating before finishing and commits only once', () => {
  for (const [label, value] of [['Too easy', 0], ['Just right', 0.5], ['Too hard', 1]]) {
    const chosen = [];
    const h = uiHarness('@/components/home/WorkoutIntensityPicker', {}, {}, [], null, {}, { component: 'testFeedbackContent' });
    const props = { workoutLabel: 'Push', accent: '#FF7A3D', onChoose: value => chosen.push(value), onClose() {} };
    const options = () => nodes(h.render(props)).filter(n => n.props?.accessibilityRole === 'radio');
    options().find(n => n.props.accessibilityLabel === 'Too hard').props.onPress();
    options().find(n => n.props.accessibilityLabel === label).props.onPress();
    assert.deepEqual(chosen, [], 'changing a rating must not finish the workout');
    assert.equal(options().filter(n => n.props.accessibilityState.checked).length, 1);
    assert.equal(options().find(n => n.props.accessibilityLabel === label).props.accessibilityState.checked, true);
    const finish = nodes(h.render(props)).find(n => n.props?.accessibilityLabel === 'Save workout');
    finish.props.onPress(); finish.props.onPress();
    assert.deepEqual(chosen, [value]);
    assert.equal(nodes(h.render(props)).find(n => n.props?.accessibilityLabel === 'Save workout').props.disabled, true);
  }
});

test('Closing workout feedback keeps the workout and rating unsubmitted', () => {
  let closed = 0, submitted = 0;
  const h = uiHarness('@/components/home/WorkoutIntensityPicker', {}, {}, [], null, {}, { component: 'testFeedbackContent' });
  const props = { workoutLabel: 'Full Body', accent: '#FF7A3D', onChoose() { submitted++; }, onClose() { closed++; } };
  nodes(h.render(props)).find(n => n.props?.accessibilityLabel === 'Too easy').props.onPress();
  nodes(h.render(props)).find(n => n.props?.accessibilityLabel === 'Close workout feedback').props.onPress();
  assert.equal(closed, 1); assert.equal(submitted, 0);
  const modal = uiHarness('@/components/home/WorkoutIntensityPicker', {}).render({ ...props, visible: false });
  assert.equal(find(modal, 'FeedbackContent'), undefined, 'dismissing unmounts the selection so it resets on the next visit');
});

test('Finish feedback preserves merged, legacy and empty-workout identities', () => {
  for (const [classification, label, accent] of [
    [{ origin: 'archetype', archetype: 'push', secondaryArchetype: 'pull', workoutTypes: ['chest', 'back'] }, 'Push + Pull', '#FF7A3D'],
    [{ origin: 'legacy', archetype: null, secondaryArchetype: null, workoutTypes: ['legs'] }, 'Legs', '#B5E53F'],
    [{ origin: 'adhoc', archetype: null, secondaryArchetype: null, workoutTypes: ['legs', 'chest'] }, 'Workout', '#FF7A3D'],
  ]) {
    const state = stateFor([exercise()]);
    Object.assign(state.currentSession, classification);
    const tree = uiHarness('@/app/workout', state).render();
    const picker = find(tree, 'WorkoutIntensityPicker');
    assert.equal(picker.props.workoutLabel, label);
    assert.equal(picker.props.accent, accent);
  }
});

test('Summary: save routine stays secondary; Share opens the card sheet, whose PDF action exports the report', async () => {
  const state=stateFor([exercise()]);
  const session={...state.currentSession,completed:true,intensity:'medium'};
  state.sessions=[session];
  state.getWeeklyProgress=()=>({completed:1,goal:3});
  state.getCustomWorkoutLabel=()=>null;
  let calls=0;
  state.shareWorkoutReportPdf=async report=>{calls++;assert.equal(report.id,'7');};
  const h=uiHarness('@/app/workout-summary',state,{sessionId:'7'});
  let tree=h.render();
  assert.ok(find(tree,'SaveAdhocRoutine'));
  assert.equal(find(tree,'SaveAdhocRoutine').props.stacked,true);
  assert.equal(find(tree,'SaveAdhocRoutine').props.secondary,true);
  assert.ok(!textOf(tree).includes('Generate report'));
  assert.equal(find(tree,'ShareSheet').props.visible,false);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Share workout').props.onPress();
  tree=h.render();
  const sheet=find(tree,'ShareSheet').props;
  assert.equal(sheet.visible,true);
  assert.equal(sheet.workoutId,session.id);
  assert.equal(calls,0);
  assert.equal(sheet.frameExercises.length,1);
  assert.equal(sheet.frameExercises[0].name,'Bench Press');
  await sheet.onSharePdf();
  assert.equal(calls,1);
});

test('Summary: a failed PDF share rejects so the sheet can retry; program sessions do not offer an invalid adhoc save', async () => {
  const state=stateFor([exercise()]);
  state.sessions=[{...state.currentSession,origin:'archetype',completed:true,intensity:'medium'}];
  state.getWeeklyProgress=()=>({completed:1,goal:3});
  state.getCustomWorkoutLabel=()=>null;
  let calls=0;
  state.shareWorkoutReportPdf=async()=>{calls++;if(calls===1)throw Error('printer failed');};
  const h=uiHarness('@/app/workout-summary',state,{sessionId:'7',source:'history'});
  const tree=h.render();
  assert.equal(find(tree,'SaveAdhocRoutine'),undefined);
  const { onSharePdf }=find(tree,'ShareSheet').props;
  await assert.rejects(onSharePdf(),/printer failed/);
  await onSharePdf();assert.equal(calls,2);
});

test('Summary: Done exits fresh completion to Progress and reopened summaries back to history', () => {
  for (const source of [undefined, 'history']) {
    const state=stateFor([exercise()]);
    state.sessions=[{...state.currentSession,completed:true}];
    state.getWeeklyProgress=()=>({completed:1,goal:3});
    state.getCustomWorkoutLabel=()=>null;
    const h=uiHarness('@/app/workout-summary',state,{sessionId:'7',source});
    const tree=h.render();
    const done=nodes(tree).find(n=>n.props?.accessibilityLabel==='Done');
    assert.equal(done.props.accessibilityHint,source==='history' ? 'Return to workout history' : 'Open Progress');
    done.props.onPress();
    assert.ok(h.events.some(event=>source==='history' ? event[0]==='back' : event[0]==='replace' && event[1]==='/(tabs)/profile'));
  }
});

test('Summary: previous comparison uses earlier verified sessions of the same load type', () => {
  const state=stateFor([exercise()]);
  state.sessions=[
    {...state.currentSession,id:'1',date:'2026-09-29',completed:true,exercises:[{...exercise(),sets:[{weight:15,reps:8,completed:true}]}]},
    {...state.currentSession,id:'2',date:'2026-09-30',completed:true,exercises:[{...exercise(),loadType:'bodyweight'}]},
    {...state.currentSession,id:'3',date:'2026-10-01',completed:true,retroactive:true,exercises:[{...exercise(),sets:[{weight:40,reps:12,completed:true}]}]},
    {...state.currentSession,completed:true},
    {...state.currentSession,id:'8',date:'2026-10-03',completed:true,exercises:[{...exercise(),sets:[{weight:99,reps:15,completed:true}]}]},
  ];
  state.getWeeklyProgress=()=>({completed:1,goal:3});
  state.getCustomWorkoutLabel=()=>null;
  const h=uiHarness('@/app/workout-summary',state,{sessionId:'7',source:'history'});
  const previous=find(h.render(),'ExerciseRecap').props.previousLifts.get('Bench Press');
  assert.equal(previous.sessionId,'1');
  assert.equal(previous.weight,15);
});

test('Save routine: dock button saves the named routine and becomes disabled after saving', () => {
  const state=stateFor([exercise()]);
  state.savedAdhocRoutineIds={};
  const calls=[];
  state.saveAdhocRoutine=(...args)=>{calls.push(args);state.savedAdhocRoutineIds['7']=23;return 23;};
  const h=uiHarness('@/components/SaveAdhocRoutine',state);
  const props={session:{...state.currentSession,completed:true},stacked:true};
  let tree=h.render(props);
  const trigger=()=>nodes(tree).find(n=>n.type==='Pressable' && n.props.disabled!==undefined);
  trigger().props.onPress();tree=h.render(props);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Routine name').props.onChangeText('My push day');tree=h.render(props);
  nodes(tree).find(n=>n.type==='Pressable' && textOf(n).includes('Save routine')).props.onPress();tree=h.render(props);
  assert.deepEqual(calls,[['7','My push day']]);
  assert.equal(trigger().props.disabled,true);
  assert.ok(textOf(trigger()).includes('Routine saved'));
});

test('Weight wheels commit display-unit tenths without rewriting the stored load on unit changes',()=>{
  const h=uiHarness('@/components/ActiveSetCard',{});const edits=[];const units=[];
  const props={valueIdentity:'set-1',setNumber:1,reps:6,weight:60.5,loadType:'external_weight',metric:'reps',
    weightIncrement:2.5,weightUnit:'kg',accent:'#4F8BFF',onWeightCommit:value=>edits.push(value),
    onWeightUnitChange:unit=>units.push(unit),onRepsCommit(){},onLog(){},onSkip(){}};
  let tree=h.render(props);let wheel=find(tree,'WorkoutWeightPicker');
  assert.equal(wheel.props.value,60.5);assert.equal(wheel.props.unit,'kg');
  assert.ok(!textOf(tree).includes('Set 1 · logged'));
  assert.equal(nodes(tree).some(n=>n.props?.accessibilityLabel==='Edit weight'),false);
  wheel.props.onChange(61.9);assert.deepEqual(edits,[61.9]);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Use pounds').props.onPress();
  assert.deepEqual(units,['lbs']);assert.deepEqual(edits,[61.9]);
  tree=h.render({...props,weightUnit:'lbs'});wheel=find(tree,'WorkoutWeightPicker');
  assert.equal(wheel.props.value,133.4);assert.equal(wheel.props.key,'set-1-lbs');
  assert.deepEqual(edits,[61.9],'Mounting or converting the wheel must not round canonical kilograms');
  wheel.props.onChange(135.7);assert.equal(edits[1],135.7/2.20462);
});

test('Weight picker geometry is stable across digit boundaries, fractions and units without mount writes',()=>{
  const edits=[];
  const h=uiHarness('@/components/WorkoutWeightPicker',{});
  let geometry;
  for(const compact of [true,false])for(const unit of ['KG','LBS'])for(const value of [0,0.1,9,9.9,10,99,99.9,100,100.5,998.9,999]) {
    const tree=h.render({value,unit,compact,onChange:v=>edits.push(v)});
    const wheels=nodes(tree).filter(n=>n.type==='WorkoutNumberWheel');
    const parents=wheels.map(w=>nodes(tree).find(n=>n.props?.children?.includes(w)));
    const selection=nodes(tree).find(n=>n.props?.pointerEvents==='none');
    const next=JSON.stringify([parents.map(n=>n.props.style),selection.props.style]);
    geometry??=next;assert.equal(next,geometry,`${value} ${unit}`);
    assert.equal(wheels[0].props.value,Math.floor(value));
    assert.equal(wheels[1].props.value,Math.round(value*10)%10);
    assert.equal(wheels[0].props.textAlign,'right');assert.equal(wheels[1].props.textAlign,'left');
    assert.ok(wheels[0].props.label.includes(unit));
  }
  assert.deepEqual(edits,[]);
});

test('Weight and reps pickers stop at 999 and 99 without changing stored values on mount',()=>{
  const edits=[];
  const weights=uiHarness('@/components/WorkoutWeightPicker',{});
  const props={value:998.9,unit:'kg',compact:true,onChange:value=>edits.push(value)};
  let tree=weights.render(props);
  let wheels=nodes(tree).filter(n=>n.type==='WorkoutNumberWheel');
  assert.equal(wheels[0].props.maximum,999);
  assert.equal(wheels[1].props.maximum,9);
  wheels[0].props.onChange(999);assert.deepEqual(edits,[999]);
  tree=weights.render({...props,value:999});wheels=nodes(tree).filter(n=>n.type==='WorkoutNumberWheel');
  assert.equal(wheels[1].props.maximum,0,'The decimal column cannot push the total above 999');
  assert.equal(wheels[1].props.value,0);
  tree=weights.render({...props,value:1200});wheels=nodes(tree).filter(n=>n.type==='WorkoutNumberWheel');
  assert.equal(wheels[0].props.value,999);
  assert.deepEqual(edits,[999],'Opening an out-of-range historical value never writes it back');
  const reps=uiHarness('@/components/WorkoutRepsPicker',{});
  const repWheel=find(reps.render({value:120,onChange:value=>edits.push(value)}),'WorkoutNumberWheel');
  assert.equal(repWheel.props.value,99);assert.equal(repWheel.props.maximum,99);
  assert.deepEqual(edits,[999]);
});

test('Separate reps controls preserve bodyweight, duration, bonus, and completed-set actions',()=>{
  const h=uiHarness('@/components/ActiveSetCard',{});const events=[];
  const props={valueIdentity:'set-1',setNumber:1,reps:6,weight:60,loadType:'bodyweight',metric:'reps',
    weightIncrement:2.5,accent:'#4F8BFF',onRepsCommit:value=>events.push(['reps',value]),
    onWeightCommit(){},onLog:()=>events.push(['log']),onSkip:()=>events.push(['skip'])};
  let tree=h.render(props);assert.equal(find(tree,'WorkoutWeightPicker'),undefined);
  const reps=find(tree,'WorkoutRepsPicker');assert.equal(reps.props.value,6);
  reps.props.onChange(12);assert.deepEqual(events,[['reps',12]]);
  find(tree,'WorkoutLogAction').props.onLog();
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Skip set 1').props.onPress();
  assert.deepEqual(events,[['reps',12],['log'],['skip']]);
  tree=h.render({...props,metric:'duration',durationS:90});
  assert.equal(find(tree,'WorkoutRepsPicker'),undefined);assert.ok(textOf(tree).includes('1:30'));
  tree=h.render({...props,heading:'Extra Set',badgeLabel:'Bonus set',primaryLabel:'Done',secondaryLabel:'Cancel'});
  assert.ok(textOf(tree).includes('Extra Set'));assert.equal(find(tree,'StatusPill').props.label,'Bonus set');
  tree=h.render({...props,primaryLabel:'Done editing',secondaryLabel:'Back'});
  assert.ok(nodes(tree).some(n=>n.props?.accessibilityLabel==='Done editing set 1'));
  assert.ok(nodes(tree).some(n=>n.props?.accessibilityLabel==='Back set 1'));
});

test('Timed card exposes start, stop, resume and reset, and commits timing before logging',()=>{
  const state={}; const h=uiHarness('@/components/ActiveSetCard',state);
  const timerTarget={setId:'set-1',completed:false};
  const props={valueIdentity:'set-1',setNumber:1,reps:0,weight:0,loadType:'bodyweight',metric:'duration',
    durationS:85,timerTarget,weightIncrement:2.5,accent:'#4F8BFF',onRepsCommit(){},onWeightCommit(){},
    onLog:()=>h.events.push(['log']),onSkip:()=>h.events.push(['skip'])};
  let tree=h.render(props);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Start timer for set 1').props.onPress();
  assert.deepEqual(h.events,[['timerStart',timerTarget]]);
  state.timerView={timer:{originalDurationS:85},running:true,elapsedS:42};
  tree=h.render(props);
  assert.ok(textOf(tree).includes('0:42'));assert.ok(textOf(tree).includes('Target'));
  assert.equal(find(tree,'Stepper'),undefined,'Running time is not editable');
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Stop timer for set 1').props.onPress();
  assert.deepEqual(h.events.at(-1),['timerStop',timerTarget]);
  state.timerView.running=false;tree=h.render({...props,durationS:42});
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Resume timer for set 1').props.onPress();
  assert.deepEqual(h.events.at(-1),['timerStart',timerTarget]);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Reset timer for set 1').props.onPress();
  assert.deepEqual(h.events.at(-1),['timerReset',timerTarget]);
  find(tree,'WorkoutLogAction').props.onLog();
  assert.deepEqual(h.events.slice(-2),[['timerStop',timerTarget],['log']]);
  state.timerStopResult=false;find(tree,'WorkoutLogAction').props.onLog();
  assert.deepEqual(h.events.at(-1),['timerStop',timerTarget],'A failed time commit cannot complete the set');
  tree=h.render({...props,timerTarget:null,primaryLabel:'Done editing'});
  assert.equal(nodes(tree).some(n=>/timer for/.test(n.props?.accessibilityLabel)),false);
});

test('Log acknowledges once with a tick before advancing and cancels a stale submission on unmount',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const h=uiHarness('@/components/WorkoutLogAction',{});let submissions=0;
  const props={label:'Log',accessibilityLabel:'Log set 1',accent:'#4F8BFF',onLog:()=>submissions++};
  let tree=h.render(props);
  const glyphs=()=>nodes(tree).filter(n=>n.type==='Animated.View');
  assert.equal(glyphs()[0].props.style[1].opacity,1);
  assert.equal(glyphs()[1].props.style[1].opacity,0);
  tree.props.onPress();tree.props.onPress();tree=h.render(props);
  assert.equal(tree.props.disabled,true);
  assert.equal(glyphs()[0].props.style[1].opacity,0);
  assert.equal(glyphs()[1].props.style[1].opacity,1);
  assert.equal(textOf(tree).includes('Done'),false);
  assert.equal(submissions,0);
  t.mock.timers.tick(319);assert.equal(submissions,0);
  t.mock.timers.tick(1);assert.equal(submissions,1);
  tree=h.render(props);assert.equal(tree.props.disabled,false);
  tree.props.onPress();h.unmount();t.mock.timers.tick(1000);
  assert.equal(submissions,1,'Changing sets or leaving must cancel a pending log');
});

test('Reps percentage compares the displayed set with its previous set and omits missing baselines',()=>{
  for (const [previousReps,reps,expected] of [[6,12,'+100%'],[6,3,'-50%'],[6,6,'+0%'],[0,12,null],[null,12,null]]) {
    const item=exercise();
    item.sets=[...(previousReps===null?[]:[{reps:previousReps,weight:60,completed:true}]),{reps,weight:101.4,completed:false}];
    const card=find(uiHarness('@/app/workout',stateFor([item])).render(),'ActiveSetCard');
    assert.equal(card.props.repsDeltaLabel,expected);
    if(previousReps!==null)assert.equal(card.props.weightDeltaLabel,'+69%');
    item.metric='duration';
    assert.equal(find(uiHarness('@/app/workout',stateFor([item])).render(),'ActiveSetCard').props.repsDeltaLabel,null);
  }
});

test('Reps ruler snaps at rest, bounds values, and exposes adjustment without a drag',()=>{
  const h=uiHarness('@/components/WorkoutNumberWheel',{});const edits=[];
  const props={value:6,minimum:1,maximum:999,label:'Repetitions',horizontal:true,onChange:value=>edits.push(value)};
  let tree=h.render(props);tree.props.onLayout({nativeEvent:{layout:{width:140}}});tree=h.render(props);
  const list=nodes(tree).find(n=>n.props?.onMomentumScrollEnd);
  list.props.onScrollBeginDrag();
  list.props.onScrollEndDrag({nativeEvent:{contentOffset:{x:9*44,y:0},velocity:{x:0.5,y:0}}});
  assert.deepEqual(edits,[],'A moving ruler commits after momentum settles');
  list.props.onMomentumScrollEnd({nativeEvent:{contentOffset:{x:9*44+10,y:0}}});assert.deepEqual(edits,[10]);
  list.props.onScrollEndDrag({nativeEvent:{contentOffset:{x:-44,y:0},velocity:{x:0,y:0}}});assert.equal(edits.at(-1),1);
  list.props.onMomentumScrollEnd({nativeEvent:{contentOffset:{x:2000*44,y:0}}});assert.equal(edits.at(-1),999);
  tree.props.onAccessibilityAction({nativeEvent:{actionName:'increment'}});assert.equal(edits.at(-1),7);
  tree=h.render({...props,value:1});tree.props.onAccessibilityAction({nativeEvent:{actionName:'decrement'}});assert.equal(edits.at(-1),7);
  assert.equal(tree.props.accessibilityValue.text,'1 reps');
});

test('Logger scroll viewport reaches the safe-area bottom with floating-action clearance inside the content',()=>{
  const first=exercise();first.sets[0].completed=false;
  const h=uiHarness('@/app/workout',stateFor([first,{...first,name:'Incline Dumbbell Press'}]));
  const tree=h.render();const scroll=find(tree,'Animated.ScrollView');
  const card=nodes(scroll).find(n=>n.props?.accessibilityHint==='Shows the remaining exercise queue');
  assert.ok(card);assert.equal(card.props.style.height,82);assert.equal(card.props.style.borderRadius,22);
  const ancestors=nodes(tree).filter(n=>n!==scroll && nodes(n.props?.children).includes(scroll));
  assert.ok(ancestors.every(n=>!n.props?.style?.paddingBottom), 'no reserved strip may shorten the scroll viewport');
  assert.equal(scroll.props.contentContainerStyle.paddingBottom,60+20+16);
  assert.equal(scroll.props.keyboardShouldPersistTaps,'handled');
  assert.equal(find(scroll,'ExerciseActionPill'),undefined,'floating actions remain outside the scroller');
  assert.ok(find(tree,'ExerciseActionPill'));
  card.props.onPress();assert.equal(find(h.render(),'UpNextSheet').props.visible,true);
});

test('Adhoc UI: empty logger safely mounts only empty content and add picker; minimize retains session',()=>{
  const state=stateFor();const h=uiHarness('@/app/workout',state);
  let tree=h.render();
  for(const label of ['Workout','Empty workout','Add your first exercise','Add exercise'])assert.ok(textOf(tree).includes(label));
  for(const type of ['ActiveSetCard','ExerciseFinisher','WorkoutIntensityPicker'])assert.equal(find(tree,type),undefined);
  assert.equal(find(tree,'SwapExerciseSheet').props.mode,'add');
  nodes(tree).find(n=>n.props?.onPress && textOf(n).includes('Add exercise') && n.type==='WorkoutTouchable').props.onPress();
  tree=h.render();assert.equal(find(tree,'SwapExerciseSheet').props.visible,true);
  find(tree,'WorkoutMinimizeSurface').props.onMinimize();
  assert.equal(state.currentSession.id,'7');assert.equal(h.events.at(-1)[0],'back');
});

test('Workout header: empty and populated loggers preserve change, minimize, and discard semantics',()=>{
  for (const exercises of [[], [exercise()]]) {
    const state=stateFor(exercises);const h=uiHarness('@/app/workout',state);
    let tree=h.render();const header=find(tree,'WorkoutHeaderActions');
    assert.equal(header.props.addMode,true);
    header.props.onChange();tree=h.render();
    assert.equal(find(tree,'SwapExerciseSheet').props.visible,true);
    header.props.onMinimize();
    assert.deepEqual(h.events.at(-1),['navigationOptions',{animation:'none'}]);
    assert.equal(state.currentSession.id,'7');
    header.props.onExit();
    const alert=h.events.at(-1);
    assert.equal(alert[0],'alert');assert.equal(alert[1],'Discard workout?');
    assert.equal(alert[3][0].style,'cancel');
    assert.equal(alert[3][1].style,'destructive');
    // Merely opening the alert never discards the active workout.
    assert.equal(state.currentSession.id,'7');
  }
});

test('Compact set indicators preserve logged measurements, current state, and completed-set editing',()=>{
  for (const [metric,loadType,summary] of [
    ['reps','external_weight','20 × 8'], ['reps','bodyweight','8 reps'],
    ['duration','bodyweight','1:30'], ['duration','external_weight','20 · 1:30'],
  ]) {
    const item=exercise();item.metric=metric;item.loadType=loadType;
    item.sets=[{...item.sets[0],durationS:90},{reps:8,weight:20,durationS:90,completed:false},{reps:8,weight:20,durationS:90,completed:false}];
    const state=stateFor([item]);const selections=[];
    state.selectWorkoutSet=(...args)=>selections.push(args);
    const h=uiHarness('@/app/workout',state);const progress=find(h.render(),'SetProgress');
    const markers=nodes(progress.type(progress.props)).filter(n=>n.type?.name==='SetPip');
    const [completed,current,upcoming]=markers.map(n=>n.type(n.props));
    assert.ok(textOf(completed).includes(summary));
    assert.equal(completed.props.accessibilityRole,'button');
    assert.ok(completed.props.accessibilityLabel.startsWith('Edit completed set 1,'));
    assert.equal(current.props.accessibilityLabel,'Set 2, current');
    assert.equal(upcoming.props.accessibilityLabel,'Set 3, upcoming');
    const before=JSON.stringify(state.currentSession);
    completed.props.onPress();assert.deepEqual(selections,[[0,0]]);
    assert.equal(JSON.stringify(state.currentSession),before);
    const bonusMarkers=nodes(progress.type({...progress.props,onEditCompletedSet:undefined,currentLabel:'DROP'})).filter(n=>n.type?.name==='SetPip');
    assert.equal(bonusMarkers[0].type(bonusMarkers[0].props).props.accessibilityRole,undefined);
    assert.equal(bonusMarkers[1].type(bonusMarkers[1].props).props.accessibilityLabel,'Set 2, current, DROP');
  }
});

test('Set review follows the selected logged set while keeping the active card mounted',()=>{
  const item=exercise();
  item.sets=[{weight:60,reps:6,completed:true},{weight:60.5,reps:7,completed:true},{weight:61,reps:8,completed:false}];
  const state=stateFor([item]);
  state.selectWorkoutSet=(exerciseIndex,setIndex)=>{state.selectedSet={exerciseIndex,setIndex,setId:`set-${setIndex}`,completed:true};};
  state.getSetEditTarget=()=>state.selectedSet ?? {exerciseIndex:0,setIndex:2,setId:'set-2',completed:false};
  state.clearSelectedSet=()=>{state.selectedSet=null;};
  const before=JSON.stringify(state.currentSession);
  const h=uiHarness('@/app/workout',state);
  const markerNodes=tree=>{const rail=find(tree,'SetProgress');return nodes(rail.type(rail.props)).filter(n=>n.type?.name==='SetPip').map(n=>n.type(n.props));};
  let tree=h.render();
  const initialKeys=nodes(tree).filter(n=>n.props?.key!==undefined).map(n=>n.props.key);
  for(const index of [0,1,0,1]) {
    markerNodes(tree)[index].props.onPress();tree=h.render();
    const card=find(tree,'ActiveSetCard');
    assert.equal(card.props.heading,undefined);
    assert.equal(card.props.weight,item.sets[index].weight);
    assert.equal(card.props.reps,item.sets[index].reps);
    assert.deepEqual(markerNodes(tree).map(n=>n.props.accessibilityState.selected),[index===0,index===1,false]);
    assert.deepEqual(nodes(tree).filter(n=>n.props?.key!==undefined).map(n=>n.props.key),initialKeys,
      'Set navigation must not remount the structural card or stage');
  }
  markerNodes(tree)[2].props.onPress();tree=h.render();
  assert.equal(state.selectedSet,null);
  assert.equal(find(tree,'ActiveSetCard').props.setNumber,3);
  assert.deepEqual(markerNodes(tree).map(n=>n.props.accessibilityState.selected),[false,false,true]);
  markerNodes(tree)[0].props.onPress();tree=h.render();
  find(tree,'ActiveSetCard').props.onSkip();tree=h.render();
  assert.equal(state.selectedSet,null);
  assert.equal(JSON.stringify(state.currentSession),before,'Review and return must never log or modify a set');
});

test('Set selection uses measured bounds on initial mount, navigation, and wrapped rows',()=>{
  const h=uiHarness('@/components/WorkoutSetRail',{});
  const props={selectedIndex:0,accent:'#4F8BFF',children:[0,1,2].map(i=>({type:'View',key:`set-${i}`,props:{}}))};
  let tree=h.render(props);
  const slots=nodes(tree).filter(n=>n.props?.onLayout);
  const frames=[{x:0,y:0,width:114,height:56},{x:120,y:0,width:114,height:56},{x:0,y:56,width:354,height:72}];
  slots.forEach((slot,i)=>slot.props.onLayout({nativeEvent:{layout:frames[i]}}));
  h.render(props);tree=h.render(props);
  const highlight=tree=>nodes(tree).find(n=>n.props?.testID==='set-selection-highlight');
  const geometry=tree=>highlight(tree).props.style[1];
  assert.equal(geometry(tree).opacity,1);
  assert.deepEqual(geometry(tree).transform,[{translateX:0},{translateY:6}]);
  assert.equal(h.events.filter(e=>e[0]==='spring').length,0,'Initial placement must not fly in from the origin');
  const selectionType=highlight(tree).type;
  for(const index of [1,2,1,0]) {
    h.render({...props,selectedIndex:index});tree=h.render({...props,selectedIndex:index});
    assert.equal(highlight(tree).type,selectionType);
    assert.deepEqual(geometry(tree).transform,[{translateX:frames[index].x},{translateY:frames[index].y+6}]);
    assert.equal(geometry(tree).width,frames[index].width);
    assert.equal(geometry(tree).height,frames[index].height-12);
  }
  assert.equal(h.events.filter(e=>e[0]==='spring').length,16,'Every subsequent move retargets all four measured bounds');
  assert.equal(highlight(tree).props.pointerEvents,'none','The moving surface must never intercept set taps');
});

test('Logging advances the persistent rail and completed glyph without rebuilding the stage',()=>{
  const item=exercise();item.sets=[{weight:60,reps:6,completed:false},{weight:60.5,reps:6,completed:false},{weight:61,reps:6,completed:false}];
  const state=stateFor([item]);
  state.getSetEditTarget=()=>{const setIndex=item.sets.findIndex(s=>!s.completed);return {exerciseIndex:0,setIndex,setId:`set-${setIndex}`,completed:false};};
  state.applyActiveSetAction=target=>{item.sets[target.setIndex].completed=true;return {status:'applied',completedExercise:false};};
  const h=uiHarness('@/app/workout',state);
  let tree=h.render();
  const keys=nodes(tree).filter(n=>n.props?.key!==undefined).map(n=>n.props.key);
  let progress=find(tree,'SetProgress');let rail=progress.type(progress.props);
  assert.equal(rail.props.selectedIndex,0);
  find(tree,'ActiveSetCard').props.onLog();tree=h.render();
  progress=find(tree,'SetProgress');rail=progress.type(progress.props);
  assert.equal(rail.props.selectedIndex,1);
  const pips=nodes(rail).filter(n=>n.type?.name==='SetPip');
  const logged=pips[0].type(pips[0].props);
  assert.equal(find(logged,'WorkoutSetGlyph').props.completed,true);
  assert.equal(pips[1].props.selected,true);
  assert.deepEqual(nodes(tree).filter(n=>n.props?.key!==undefined).map(n=>n.props.key),keys);
});

test('Exercise info sits beside the exercise title and opens the existing sheet',()=>{
  const item=exercise();item.sets.push({weight:20,reps:8,completed:false});
  const info={name:item.name,description:'Test instructions'};
  const h=uiHarness('@/app/workout',stateFor([item]),{},[],info);
  let tree=h.render();
  const title=nodes(tree).find(n=>n.props?.key?.startsWith('title-'));
  const button=find(title,'ExerciseInfoButton');assert.ok(button);
  const rendered=button.type(button.props);
  assert.equal(rendered.props.accessibilityLabel,'Exercise info');
  assert.equal(find(tree,'ActiveSetCard').props.onInfoPress,undefined);
  rendered.props.onPress();tree=h.render();
  assert.equal(find(tree,'ExerciseInfo').props.visible,true);
  assert.equal(find(tree,'ExerciseInfo').props.info,info);
});

test('Adhoc UI: app and Live Activity end-of-list offer add/finish without automatic feedback; append clears feedback',()=>{
  for(const params of [{},{finishFromActivity:'7'}]){
    const state=stateFor([exercise()]);const h=uiHarness('@/app/workout',state,params);
    let tree=h.render();const finisher=find(tree,'ExerciseFinisher');
    assert.equal(typeof finisher.props.onAddAnother,'function');
    assert.equal(find(tree,'WorkoutIntensityPicker').props.visible,false);
    finisher.props.onAddAnother();tree=h.render();assert.equal(find(tree,'SwapExerciseSheet').props.visible,true);
    finisher.props.onAdvance();tree=h.render();assert.equal(find(tree,'WorkoutIntensityPicker').props.visible,true);
    find(tree,'SwapExerciseSheet').props.onAdded();tree=h.render();
    assert.equal(find(tree,'WorkoutIntensityPicker').props.visible,false);
    assert.equal(params.finishFromActivity,'');
  }
});

test('Last-exercise add opens the picker in add mode for every workout and continues with the new exercise',()=>{
  for(const origin of ['adhoc','custom_split','archetype','legacy']){
    const completed=exercise();const state=stateFor([completed]);state.currentSession.origin=origin;
    state.setWorkoutExerciseIndex=index=>{state.workoutFocus={workoutId:'7',exerciseIndex:index};};
    const h=uiHarness('@/app/workout',state);
    let tree=h.render();const finisher=find(tree,'ExerciseFinisher');
    assert.equal(typeof finisher.props.onAddAnother,'function',origin);
    const rendered=uiHarness('@/components/ExerciseFinisher',{}).render(finisher.props);
    const buttons=nodes(rendered).filter(n=>n.props?.accessibilityRole==='button');
    assert.ok(buttons.findIndex(n=>n.props.accessibilityLabel==='Add exercise') < buttons.findIndex(n=>n.props.accessibilityLabel==='Finish workout'));
    finisher.props.onAddAnother();tree=h.render();
    const picker=find(tree,'SwapExerciseSheet');
    assert.equal(picker.props.visible,true);assert.equal(picker.props.mode,'add');assert.equal(picker.props.sessionId,'7');
    const added={...exercise(),name:'Face Pull',sets:[{reps:12,weight:10,completed:false}]};
    state.currentSession.exercises.push(added);
    picker.props.onAdded();picker.props.onClose();tree=h.render();
    assert.equal(state.workoutFocus.exerciseIndex,1);
    assert.equal(state.currentSession.exercises[0],completed);
    assert.equal(find(tree,'SwapExerciseSheet').props.visible,false);
    assert.equal(find(tree,'WorkoutIntensityPicker').props.visible,false);
    find(tree,'WorkoutHeaderActions').props.onChange();tree=h.render();
    assert.equal(find(tree,'SwapExerciseSheet').props.mode,origin==='adhoc'?'add':'manage');
  }
});

test('An exercise with remaining work offers advance without the last-exercise add action',()=>{
  const remaining={...exercise(),name:'Face Pull',sets:[{reps:12,weight:10,completed:false}]};
  const state=stateFor([exercise(),remaining]);state.currentSession.origin='custom_split';
  state.workoutFocus={workoutId:'7',exerciseIndex:0};
  const tree=uiHarness('@/app/workout',state).render();
  assert.equal(find(tree,'ExerciseFinisher').props.nextExercise,remaining);
  assert.equal(find(tree,'ExerciseFinisher').props.onAddAnother,undefined);
});

test('Adhoc UI: all-skipped finisher disables finish but still offers another exercise',()=>{
  const item=exercise();item.sets[0].skipped=true;
  const h=uiHarness('@/app/workout',stateFor([item]));const tree=h.render();
  const props=find(tree,'ExerciseFinisher').props;assert.equal(props.canFinish,false);assert.equal(typeof props.onAddAnother,'function');
  const finisher=uiHarness('@/components/ExerciseFinisher',{}).render(props);
  assert.ok(textOf(finisher).includes('Add exercise'));assert.ok(textOf(finisher).includes('Finish workout'));
  assert.ok(nodes(finisher).some(n=>n.props?.onPress===props.onAdvance && n.props.disabled));
});

test('Adhoc UI: add-only selection appends with session identity and closes only after success; duplicate is visible',()=>{
  const catalog=[{id:1,name:'Bench Press',workoutType:'chest',primaryMuscle:'Chest'}];
  let succeeds=false;const calls=[];const state=stateFor();state.appendExerciseToSession=(...args)=>{calls.push(args);return succeeds;};
  const h=uiHarness('@/components/SwapExerciseSheet',state,{},catalog);
  let closed=0,added=0;
  const props={mode:'add',sessionId:'7',visible:true,dayLabel:'Workout',accent:'#aaaaaa',sessionExercises:[],onClose:()=>closed++,onAdded:()=>added++,onNavigate(){}};
  let tree=h.render(props);find(tree,'ExerciseSwapRow').props.onPress();assert.equal(closed,0);
  succeeds=true;tree=h.render(props);find(tree,'ExerciseSwapRow').props.onPress();
  assert.deepEqual(calls,[['Bench Press','7'],['Bench Press','7']]);assert.equal(closed,1);assert.equal(added,1);
  tree=h.render({...props,sessionExercises:[exercise()]});
  nodes(tree).filter(n=>n.type?.name==='ExerciseSwapRow').at(-1).props.onPress();
  assert.equal(h.events.at(-1)[1],'Already added');
});

test('Adhoc UI: custom creator sends measurement choices to catalog-only API, appends and closes',()=>{
  const state=stateFor(),calls=[];
  state.createCustomExercise=(...args)=>{calls.push(['create',...args]);return 11;};
  state.appendExerciseToSession=(...args)=>{calls.push(['append',...args]);return true;};
  const h=uiHarness('@/components/SwapExerciseSheet',state);
  let closed=0;
  const props={mode:'add',sessionId:'7',visible:true,dayLabel:'Workout',accent:'#aaaaaa',sessionExercises:[],onClose:()=>closed++,onNavigate(){}};
  let tree=h.render(props);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Add exercise').props.onPress();tree=h.render(props);
  nodes(tree).find(n=>n.props?.placeholder==='Exercise name').props.onChangeText('Timed hold');tree=h.render(props);
  nodes(tree).find(n=>n.props?.accessibilityRole==='radio' && n.props.accessibilityLabel==='Chest').props.onPress();tree=h.render(props);
  for(const label of ['Bodyweight','Time']) {
    nodes(tree).find(n=>n.props?.accessibilityRole==='radio' && textOf(n).includes(`"${label}"`)).props.onPress();tree=h.render(props);
  }
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Create new exercise').props.onPress();
  assert.deepEqual(calls,[['create','Timed hold','chest','Chest','Other','bodyweight','duration'],['append','Timed hold','7']]);
  assert.equal(closed,1);
});

test('Exercise editor: typing searches the whole catalog before a muscle is chosen and reuses an exact match',()=>{
  const catalog=[{id:1,name:'Bench Press',workoutType:'chest',primaryMuscle:'Chest'}];
  const state=stateFor(),calls=[];
  state.appendExerciseToSession=(...args)=>{calls.push(args);return true;};
  state.createCustomExercise=()=>assert.fail('An existing exercise must never be duplicated');
  const h=uiHarness('@/components/SwapExerciseSheet',state,{},catalog);
  let closed=0;
  const props={mode:'add',sessionId:'7',visible:true,dayLabel:'Workout',accent:'#4F8BFF',sessionExercises:[],onClose:()=>closed++,onNavigate(){}};
  let tree=h.render(props);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Add exercise').props.onPress();tree=h.render(props);
  const input=()=>nodes(tree).find(n=>n.props?.accessibilityLabel==='Exercise name');
  input().props.onChangeText('bench');tree=h.render(props);
  assert.ok(nodes(tree).some(n=>n.props?.accessibilityLabel==='Use Bench Press'));
  assert.equal(nodes(tree).some(n=>n.type?.name==='ExerciseSwapRow'),false,'The workout catalog must not compete with the active editor');
  input().props.onChangeText(' bench press ');tree=h.render(props);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Use existing exercise').props.onPress();tree=h.render(props);
  assert.deepEqual(calls,[['Bench Press','7']]);assert.equal(closed,1);
  assert.ok(h.events.some(e=>e[0]==='keyboardDismiss'));
});

test('Exercise editor: failed addition keeps the typed name, exposes recovery, and retries without creating a duplicate',()=>{
  const catalog=[{id:1,name:'Bench Press',workoutType:'chest',primaryMuscle:'Chest'}];
  const state=stateFor();let succeeds=false,closed=0;
  state.appendExerciseToSession=()=>succeeds;
  const h=uiHarness('@/components/SwapExerciseSheet',state,{},catalog);
  const props={mode:'add',sessionId:'7',visible:true,dayLabel:'Workout',accent:'#4F8BFF',sessionExercises:[],onClose:()=>closed++,onNavigate(){}};
  let tree=h.render(props);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Add exercise').props.onPress();tree=h.render(props);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Exercise name').props.onChangeText('Bench Press');tree=h.render(props);
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Use Bench Press').props.onPress();tree=h.render(props);
  assert.equal(closed,0);
  assert.equal(nodes(tree).find(n=>n.props?.accessibilityLabel==='Exercise name').props.value,'Bench Press');
  assert.ok(textOf(nodes(tree).find(n=>n.props?.accessibilityRole==='alert')).includes('Try again'));
  succeeds=true;
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Use existing exercise').props.onPress();tree=h.render(props);
  assert.equal(closed,1);
});

test('Exercise editor: validation and catalog errors preserve input; cancel and reopen clear transient choices',()=>{
  const state=stateFor();state.createCustomExercise=()=>{throw new Error('Name is already used');};
  const h=uiHarness('@/components/SwapExerciseSheet',state);
  const props={mode:'add',sessionId:'7',visible:true,dayLabel:'Workout',accent:'#4F8BFF',sessionExercises:[],onClose(){},onNavigate(){}};
  let tree=h.render(props);
  const get=label=>nodes(tree).find(n=>n.props?.accessibilityLabel===label);
  get('Add exercise').props.onPress();tree=h.render(props);
  assert.equal(get('Create new exercise').props.disabled,true);
  get('Exercise name').props.onChangeText('Cable hold');tree=h.render(props);
  get('Exercise name').props.onSubmitEditing();tree=h.render(props);
  assert.ok(textOf(tree).includes('Choose a muscle group.'));
  get('Chest').props.onPress();tree=h.render(props);
  assert.equal(get('Create new exercise').props.disabled,false);
  get('Create new exercise').props.onPress();tree=h.render(props);
  assert.equal(get('Exercise name').props.value,'Cable hold');assert.ok(textOf(tree).includes('An exercise with this name already exists.'));
  get('Back to exercises').props.onPress();tree=h.render(props);
  get('Add exercise').props.onPress();tree=h.render(props);
  assert.equal(get('Exercise name').props.value,'');assert.equal(get('Chest').props.accessibilityState.checked,false);
  assert.equal(nodes(tree).some(n=>n.props?.accessibilityRole==='alert'),false);
});

test('Wrap-up lists sets as edit rows, adds one set, compares to last time and starts the next exercise',()=>{
  const events=[];
  const next={name:'Romanian Deadlift',loadType:'external_weight',metric:'reps',entryUnit:'kg',sets:[{reps:10,weight:70},{reps:10,weight:70},{reps:10,weight:70}]};
  const props={sets:[{reps:8,weight:60,completed:true},{reps:8,weight:62.5,completed:true},{reps:10,weight:50,completed:true,type:'dropset'}],
    nextExercise:next,accent:'#B5E53F',addSetBase:{reps:8,weight:62.5,completed:true},recordSetIndexes:[1],
    recordHint:{best:{weight:62.5,reps:8},beatReps:9},comparison:{measure:'volume',current:1480,previous:1360},restStartedAt:null,
    weightUnit:'kg',loadType:'external_weight',metric:'reps',onAdvance:()=>events.push(['advance']),
    onEditSet:i=>events.push(['edit',i]),onAddSet:s=>events.push(['add',s])};
  const tree=uiHarness('@/components/ExerciseFinisher',{}).render(props);
  const text=textOf(tree);
  for(const gone of ['PR Attempt','Drop Set','Extra Set','Tap a set'])assert.ok(!text.includes(gone),gone);
  const rows=nodes(tree).filter(n=>n.type?.name==='SetRow');
  assert.deepEqual(rows.map(r=>r.props.label),['60 kg × 8','62.5 kg × 8','50 kg × 10']);
  assert.deepEqual(rows.map(r=>r.props.isRecord),[false,true,false]);
  const recordRow=rows[1].type(rows[1].props);
  assert.equal(recordRow.props.accessibilityLabel,'Set 2, 62.5 kg × 8, personal record');
  assert.ok(textOf(rows[2].type(rows[2].props)).includes('DROP'));
  rows[2].props.onPress();
  nodes(tree).find(n=>n.props?.accessibilityLabel==='Add set, starting at 62.5 kg × 8').props.onPress();
  assert.deepEqual(events,[['edit',2],['add',{type:'extra',reps:8,weight:62.5}]]);
  assert.ok(!text.includes('9 reps beats it'),'a record already set today replaces the hint');
  assert.ok(text.includes('1,480 kg total')&&text.includes('+120 kg vs last time'));
  const start=nodes(tree).find(n=>n.props?.accessibilityLabel==='Start Romanian Deadlift, 3 sets · 70 kg × 10');
  assert.equal(start.props.onPress,props.onAdvance);assert.equal(start.props.disabled,false);
  const hinted=uiHarness('@/components/ExerciseFinisher',{}).render({...props,recordSetIndexes:[],comparison:{measure:'volume',current:960,previous:null}});
  assert.ok(textOf(hinted).includes('Best is 62.5 kg × 8. 9 reps beats it.'));assert.ok(textOf(hinted).includes('first time'));
});

test('Wrap-up add set logs and returns to the wrap-up without advancing',()=>{
  const lift=exercise();lift.sets.push({reps:8,weight:20,completed:true});
  const state=stateFor([lift,{...exercise(),name:'Incline Press',sets:[{reps:8,weight:20}]}]);
  Object.assign(state.currentSession,{origin:'custom'});
  const appended=[];let index=0;
  state.setWorkoutExerciseIndex=i=>{index=i;};state.workoutFocus={workoutId:'7',exerciseIndex:0};
  state.appendBonusSet=(...args)=>{appended.push(args);state.currentSession.exercises[0].sets.push({type:args[1],reps:args[2],weight:args[3],completed:true});};
  const h=uiHarness('@/app/workout',state);
  let tree=h.render();let finisher=find(tree,'ExerciseFinisher');
  assert.equal(finisher.props.nextExercise.name,'Incline Press');
  finisher.props.onAddSet({type:'extra',reps:8,weight:20});tree=h.render();
  const bonus=find(tree,'BonusSet');assert.equal(bonus.props.setNumber,3);assert.equal(find(tree,'ExerciseFinisher'),undefined);
  bonus.props.onTypeChange('dropset');tree=h.render();
  find(tree,'BonusSet').props.onDone({type:'dropset',reps:12,weight:15});tree=h.render();
  assert.deepEqual(appended,[[0,'dropset',12,15,undefined]]);
  finisher=find(tree,'ExerciseFinisher');assert.ok(finisher,'back on the wrap-up');
  assert.equal(finisher.props.enteringSetIndex,2);assert.equal(index,0,'no automatic advance');
  assert.equal(nodes(tree).some(n=>n.type==='BonusSetAcknowledgement'),false);
});

test('Add-set logger offers a drop toggle for weighted reps only',()=>{
  const done=[];const changes=[];
  const props={selection:{type:'extra',reps:8,weight:62.5},setNumber:4,accent:'#B5E53F',weightIncrement:2.5,weightUnit:'kg',
    loadType:'external_weight',metric:'reps',onTypeChange:t=>changes.push(t),onDone:s=>done.push(s),onCancel(){}};
  const h=uiHarness('@/components/BonusSet',{});
  let card=find(h.render(props),'ActiveSetCard');
  assert.equal(card.props.heading,'Set 4');assert.equal(card.props.primaryLabel,'Log');assert.equal(card.props.accent,'#B5E53F');
  const toggle=card.props.headingAccessory;
  assert.equal(toggle.type(toggle.props).props.accessibilityState.checked,false);
  toggle.props.onPress();card=find(h.render(props),'ActiveSetCard');
  assert.equal(card.props.weight,50);assert.equal(card.props.accent,'#9B72F2');assert.deepEqual(changes,['dropset']);
  card.props.onLog();assert.deepEqual(done,[{type:'dropset',reps:8,weight:50}]);
  for(const variant of [{loadType:'bodyweight'},{metric:'duration'}])
    assert.equal(find(uiHarness('@/components/BonusSet',{}).render({...props,...variant}),'ActiveSetCard').props.headingAccessory,null);
});

function trainState(mode = 'none') {
  const starts = [];
  const state = { profile: { name: '', programMode: mode, activeSplitId: mode === 'custom' ? 7 : null, programWeeklyGoal: 3 },
    sessions: [], currentSession: null, customSplits: [], currentCustomSplit: null,
    queueState: { nextUp: ['push'], nextUpDate: null },
    loadCustomSplit: async () => null, getLastCompletedCustomWorkoutId: () => null,
    startEmptyWorkout() { starts.push('empty'); this.currentSession = stateFor().currentSession; return this.currentSession; },
    startWorkoutFromArchetype() { starts.push('stack'); }, startWorkoutFromCustomWorkout() { starts.push('custom'); },
  };
  return { state, starts };
}

test('Train departure is restored beneath the modal and a blurred slider cannot publish a stale fade',()=>{
  const departure={value:0,get(){return this.value;},set(value){this.value=value;}};
  const slider=uiHarness('@/components/home/SlideToStart',{}, {},[],null,{}, {departure,platform:'ios'});
  slider.render({color:'#FF7A3D',workoutName:'Push',onStart(){}});
  const reaction=[...slider.reactions.values()][0];
  reaction.react(1);assert.equal(departure.value,1,'focused drag fades Home');
  slider.blur();assert.equal(departure.value,0,'restore before minimize exposes Home');
  reaction.react(1);assert.equal(departure.value,0,'late offset delivery cannot re-hide Home');
  slider.focus();assert.equal(reaction.prepare(),0,'return starts at zero');
  slider.unmount();assert.equal(departure.value,0);

  const home=uiHarness('@/app/(tabs)/index',trainState().state,{},[],null,{}, {component:'default'});
  const tree=home.render();const progress=tree.props.value;
  progress.set(1);home.blur();assert.equal(progress.get(),0);
  progress.set(1);home.focus();assert.equal(progress.get(),0);home.unmount();
});

for(const mode of ['none','stack','custom']) test(`Train ${mode}: repeated resume/minimize retains content and the existing session`,()=>{
  const {state,starts}=trainState(mode);
  state.currentSession=stateFor([exercise(),{...exercise(),name:'Cable Fly'}]).currentSession;
  state.workoutFocus={workoutId:'7',exerciseIndex:1};
  const saved=JSON.stringify([state.currentSession,state.workoutFocus]);
  const h=uiHarness('@/app/(tabs)/index',state);
  try {
    for(let cycle=0;cycle<3;cycle++) {
      const tree=h.render();assert.ok(textOf(tree).includes('greeting:'));
      if(mode==='none')assert.ok(textOf(tree).includes('Your routines'));
      else assert.ok(find(tree,'YourSplitCard'));
      const hero=find(tree,'WorkoutHeroCard');assert.equal(hero.props.actionLabel,'Resume workout');
      hero.props.onPress();h.blur();h.focus();
      assert.equal(JSON.stringify([state.currentSession,state.workoutFocus]),saved);
    }
    assert.equal(h.events.filter(event=>event[0]==='push').length,3);assert.deepEqual(starts,[]);
  } finally {h.unmount();}
});

test('Train without a program: opening and browsing show a ready hero and never launch a session', () => {
  const { state, starts } = trainState();
  const h = uiHarness('@/app/(tabs)/index', state);
  try {
    const tree = h.render();
    const hero = find(tree, 'WorkoutHeroCard').props;
    assert.equal(hero.title, 'Ready when you are.');
    assert.equal(hero.description, 'Start a workout and add exercises as you go.');
    assert.equal(hero.completed, undefined);
    assert.equal(hero.showStackMark, true);
    assert.equal(find(tree, 'YourSplitCard'), undefined);
    const browse = nodes(tree).filter(node => ['Get Stack’s plan', 'Your routines'].includes(node.props?.accessibilityLabel));
    assert.equal(browse.length, 2);
    browse[0].props.onPress(); browse[1].props.onPress();
    assert.deepEqual(h.events.filter(event => event[0] === 'push').map(event => event[1]), [
      { pathname: '/program-setup', params: { source: 'train' } }, { pathname: '/your-splits', params: { focus: 'library' } },
    ]);
    assert.deepEqual(starts, []);
    assert.equal(state.currentSession, null);
    assert.equal(state.profile.programMode, 'none');
  } finally { h.unmount(); }
});

test('preview Train: Stack discovery opens configuration and browsing starts no workout', () => {
  const {state,starts}=trainState();
  const h=uiHarness('@/app/(tabs)/index',state,{},[],null,{}, {preview:true});
  try {
    nodes(h.render()).find(node=>node.props?.accessibilityLabel==='Get Stack’s plan').props.onPress();
    assert.deepEqual(h.events.filter(event=>event[0]==='push'),[['push',{pathname:'/program-setup',params:{source:'train'}}]]);
    assert.deepEqual(starts,[]);assert.equal(state.currentSession,null);assert.equal(state.profile.programMode,'none');
  } finally { h.unmount(); }
});

test('first empty start: unit sheet resets the source handle and Train departure before any session exists',()=>{
  const {state,starts}=trainState();state.profile.weightUnit='kg';state.profile.weightUnitConfirmed=false;
  const reset=[],departure={set:value=>reset.push(value)};
  const h=uiHarness('@/app/(tabs)/index',state,{},[],null,{}, {preview:true,departure});
  try {
    const before=find(h.render(),'WorkoutHeroCard').props;before.onPress({x:1,y:2,size:56,color:'#FF7A3D'});before.onPress();
    const after=find(h.render(),'WorkoutHeroCard').props;
    assert.ok(after.resetKey>before.resetKey);assert.deepEqual(reset,[0,0]);
    assert.deepEqual(h.events.filter(event=>event[0]==='push'),[['push','/workout-unit']]);assert.deepEqual(starts,[]);assert.equal(state.currentSession,null);
    h.launch().cancel();find(h.render(),'WorkoutHeroCard').props.onPress();assert.equal(h.events.filter(event=>event[0]==='push').length,2);
  }finally{h.unmount();}
});

test('unit sheet: failed confirmation offers Retry; repeated acceptance replaces the sheet once',()=>{
  const {state,starts}=trainState();Object.assign(state.profile,{weightUnit:'kg',weightUnitConfirmed:false});let fail=true;
  state.confirmWorkoutWeightUnit=unit=>{assert.equal(h.beforeRemove(),true);if(fail)throw Error('disk');Object.assign(state.profile,{weightUnit:unit,weightUnitConfirmed:true});};
  const h=uiHarness('@/app/workout-unit',state,{},[],null,{}, {preview:true,intent:{kind:'empty'},fontScale:2.5});
  try{
    let tree=h.render();nodes(tree).find(n=>n.props?.accessibilityRole==='radio' && textOf(n).includes('Pounds')).props.onPress();
    tree=h.render();let button=nodes(tree).find(n=>n.props?.accessibilityRole==='button' && textOf(n).includes('Start workout'));
    button.props.onPress();tree=h.render();assert.match(textOf(tree),/Couldn’t save your weight unit/);assert.deepEqual(starts,[]);
    fail=false;button=nodes(tree).find(n=>n.props?.accessibilityRole==='button' && textOf(n).includes('Try again'));
    button.props.onPress();button.props.onPress();h.render();assert.deepEqual(starts,['empty']);assert.equal(state.profile.weightUnit,'lbs');
    assert.deepEqual(h.events.filter(e=>['replace','dismissTo'].includes(e[0])),[['replace',{pathname:'/workout',params:{}}]]);
  }finally{h.unmount();}
});
test('unit sheet: native dismissal, explicit cancellation and unmount clear the pending intent without creation',()=>{
  for(const exit of ['native','cancel','unmount']){
    const {state,starts}=trainState();Object.assign(state.profile,{weightUnit:'kg',weightUnitConfirmed:false});
    const h=uiHarness('@/app/workout-unit',state,{},[],null,{}, {preview:true,intent:{kind:'custom',splitId:7,workoutId:12}});
    const tree=h.render();
    if(exit==='native')assert.equal(h.beforeRemove(),false);
    else if(exit==='cancel'){const cancel=nodes(tree).find(n=>n.props?.accessibilityLabel==='Cancel workout start');cancel.props.onPress();cancel.props.onPress();assert.deepEqual(h.events.filter(e=>e[0]==='back'),[['back']]);}
    h.unmount();assert.equal(h.launch().getState().intent,null);assert.deepEqual(starts,[]);assert.equal(state.profile.weightUnitConfirmed,false);
  }
});

test('unit route: flag-off and orphaned links return to the app without a questionnaire or workout',()=>{
  for(const preview of [false,true]){
    const {state,starts}=trainState();const h=uiHarness('@/app/workout-unit',state,{},[],null,{}, {preview});
    try{const tree=h.render();assert.equal(find(tree,'Redirect').props.href,'/(tabs)');assert.ok(!textOf(tree).includes('Which weight unit'));assert.deepEqual(starts,[]);}finally{h.unmount();}
  }
});

test('Train without a program: the hero launches empty logging once, preserving the tactile origin', () => {
  const { state, starts } = trainState();
  const h = uiHarness('@/app/(tabs)/index', state);
  try {
    const origin = { x: 100, y: 200, size: 56, color: '#FF7A3D' };
    const start = find(h.render(), 'WorkoutHeroCard').props.onPress;
    start(origin); h.render(); start(origin);
    assert.deepEqual(starts, ['empty']);
    assert.deepEqual(h.events.filter(event => event[0] === 'push'), [['push', { pathname: '/workout', params: { launchOrigin: JSON.stringify(origin) } }]]);
    assert.equal(state.profile.programMode, 'none');
  } finally { h.unmount(); }
});

test('Train without a program: a rejected start restores the ready hero and remains retryable', () => {
  const { state, starts } = trainState();
  const launch = state.startEmptyWorkout;
  let fail = true;
  state.startEmptyWorkout = () => fail ? undefined : launch.call(state);
  const h = uiHarness('@/app/(tabs)/index', state);
  try {
    find(h.render(), 'WorkoutHeroCard').props.onPress();
    assert.equal(h.events.some(event => event[0] === 'push'), false);
    assert.equal(find(h.render(), 'WorkoutHeroCard').props.title, 'Ready when you are.');
    fail = false;
    find(h.render(), 'WorkoutHeroCard').props.onPress();
    assert.deepEqual(starts, ['empty']);
    assert.equal(h.events.filter(event => event[0] === 'push').length, 1);
  } finally { h.unmount(); }
});

for (const mode of ['none', 'stack', 'custom']) {
  test(`Train: an active workout takes precedence in ${mode} mode and resumes once`, () => {
    const { state, starts } = trainState(mode);
    state.currentSession = stateFor([exercise()]).currentSession;
    const h = uiHarness('@/app/(tabs)/index', state);
    try {
      const hero = find(h.render(), 'WorkoutHeroCard').props;
      assert.equal(hero.title, 'Workout');
      assert.equal(hero.actionLabel, 'Resume workout');
      assert.equal(hero.whenLabel, 'IN PROGRESS');
      hero.onPress(); hero.onPress();
      assert.deepEqual(starts, []);
      assert.deepEqual(h.events.filter(event => event[0] === 'push'), [['push', { pathname: '/workout', params: { fromActivityCard: '1' } }]]);
    } finally { h.unmount(); }
  });
}

test('Train: a stale ready hero resumes a session created before its start callback', () => {
  const { state, starts } = trainState();
  const h = uiHarness('@/app/(tabs)/index', state);
  try {
    const hero = find(h.render(), 'WorkoutHeroCard').props;
    state.currentSession = stateFor().currentSession;
    hero.onPress();
    assert.deepEqual(starts, []);
    assert.deepEqual(h.events.at(-1), ['push', { pathname: '/workout', params: { fromActivityCard: '1' } }]);
  } finally { h.unmount(); }
});

test('Ready hero: expressive Stack content and descriptive copy replace fabricated exercise metrics', () => {
  const tree = uiHarness('@/components/home/WorkoutHeroCard', {}).render({ title: 'Ready when you are.',
    description: 'Start a workout and add exercises as you go.', exerciseCount: 0, showStackMark: true,
    startWorkoutName: 'empty workout', onPress() {} });
  assert.ok(textOf(tree).includes('Start a workout and add exercises as you go.'));
  assert.ok(!textOf(tree).includes('Training · 0 exercises'));
  assert.equal(find(tree, 'SlideToStart').props.workoutName, 'empty workout');
  assert.ok(find(tree, 'StackLogo'));
});

test('Train: large text replaces the slide rail with a wrapping, accessible start button', () => {
  let starts = 0;
  const display = { fontScale: 2, platform: 'ios' };
  const h = uiHarness('@/components/home/SlideToStart', {}, {}, [], null, {}, display);
  const props = { color: '#FF7A3D', workoutName: 'empty workout', onStart() { starts++; } };
  try {
    const tree = h.render(props);
    const button = find(tree, 'TouchableOpacity');
    assert.ok(button);
    assert.equal(button.props.accessibilityLabel, 'Start workout, empty workout');
    button.props.onPress(); button.props.onPress();
    assert.equal(starts, 1);
    assert.equal(find(tree, 'GestureDetector'), undefined);
    display.fontScale = 3.12; const resized = h.render(props);
    const nextButton = find(resized, 'TouchableOpacity');
    assert.equal(nextButton.props.accessibilityLabel, 'Start workout, empty workout');
    nextButton.props.onPress(); assert.equal(starts, 1, 'Live layout refresh retains the acceptance lock');
  } finally { h.unmount(); }
});


test('live text-size changes preserve the unit sheet choice and captured routine; cancellation still creates no workout', () => {
  const { state, starts } = trainState(); Object.assign(state.profile, { weightUnit: 'kg', weightUnitConfirmed: false });
  const display = { preview: true, intent: { kind: 'custom', splitId: 7, workoutId: 12 }, fontScale: 1 };
  const h = uiHarness('@/app/workout-unit', state, {}, [], null, {}, display);
  try {
    const initial = h.render();
    nodes(initial).find(n => n.props?.accessibilityRole === 'radio' && textOf(n).includes('Pounds')).props.onPress();
    const intent = h.launch().getState().intent;
    for (const size of [3.12, 1, 2.5]) {
      display.fontScale = size; const tree = h.render();
      assert.equal(h.launch().getState().intent, intent); assert.equal(h.launch().getState().unit, 'lbs');
      assert.equal(nodes(tree).find(n => n.props?.accessibilityRole === 'radio' && textOf(n).includes('Pounds')).props.accessibilityState.selected, true);
      assert.deepEqual(starts, []); assert.equal(state.profile.weightUnitConfirmed, false);
    }
    nodes(h.render()).find(n => n.props?.accessibilityLabel === 'Cancel workout start').props.onPress();
    assert.equal(h.launch().getState().intent, null); assert.deepEqual(starts, []); assert.equal(state.profile.weightUnit, 'kg');
  } finally { h.unmount(); }
});

test('Exercise history and notes share one pill: history on the left, notes on the right, for the current exercise',()=>{
  const first=exercise();first.exerciseId=3;
  const current={...exercise(),name:'Incline Bench Press',exerciseId:4,entryUnit:'lbs',sets:[{reps:8,weight:20,completed:false}]};
  const state=stateFor([first,current]);state.workoutFocus={workoutId:'7',exerciseIndex:1};
  const tree=uiHarness('@/app/workout',state).render();
  const pill=find(tree,'ExerciseActionPill');
  const [history,notes]=pill.props.children;
  assert.equal(history.type,'ExerciseHistory');
  assert.deepEqual({workoutId:history.props.workoutId,exerciseName:history.props.exerciseName,weightUnit:history.props.weightUnit},
    {workoutId:'7',exerciseName:'Incline Bench Press',weightUnit:'lbs'});
  assert.equal(notes.type,'ExerciseNotes');
  assert.deepEqual({workoutId:notes.props.workoutId,exerciseId:notes.props.exerciseId,exerciseName:notes.props.exerciseName},
    {workoutId:'7',exerciseId:4,exerciseName:'Incline Bench Press'});
  assert.equal(nodes(tree).filter(n=>n.type==='ExerciseNotes').length,1,'notes no longer float on their own');
  // Without a catalog identity there are no notes, but history still matches by exercise name.
  const legacy=uiHarness('@/app/workout',stateFor([exercise()])).render();
  const [legacyHistory,legacyNotes]=find(legacy,'ExerciseActionPill').props.children;
  assert.equal(legacyHistory.props.exerciseName,'Bench Press');
  assert.equal(legacyNotes,null);
});

test('Exercise action pill separates independent actions and collapses to a single button',()=>{
  const pill=uiHarness('@/components/ExerciseActionPill',{});
  const two=pill.render({children:[{type:'History',props:{}},{type:'Notes',props:{}}]});
  const rendered=nodes(two).filter(n=>n.type==='History'||n.type==='Notes'||n.props?.style?.height===26).map(n=>n.type==='View'?'divider':n.type);
  assert.deepEqual(rendered,['History','divider','Notes']);
  const one=pill.render({children:[{type:'History',props:{}},null]});
  assert.equal(nodes(one).filter(n=>n.props?.style?.height===26).length,0);
  assert.equal(pill.render({children:null}),null);
});

test('Notes keep their existing action as the right-hand pill button',()=>{
  const state=stateFor([]);state.notes={4:[{id:1,workoutId:'2',exerciseId:4,text:'Elbows in',createdAt:'2026-09-01T10:00:00.000Z'}]};
  const h=uiHarness('@/components/ExerciseNotes',state);
  let tree=h.render({workoutId:'7',exerciseId:4,exerciseName:'Bench Press'});
  const button=find(tree,'ExerciseActionButton');
  assert.equal(button.props.symbol,'bubble.left');
  assert.equal(button.props.accessibilityLabel,'Bench Press notes, 1 saved');
  assert.equal(button.props.accessibilityHint,'Read previous notes or write a note for this exercise');
  assert.equal(find(tree,'Modal').props.visible,false);
  button.props.onPress();tree=h.render({workoutId:'7',exerciseId:4,exerciseName:'Bench Press'});
  assert.equal(find(tree,'Modal').props.visible,true);
  assert.equal(find(tree,'Modal').props.allowSwipeDismissal,false,'drafts stay protected');
  assert.ok(textOf(find(tree,'Modal')).includes('Elbows in'));
});

test('History opens recent completed sets for this exercise only, newest first, in today’s unit',()=>{
  const lift=(sets,extra={})=>({...exercise(),sets:sets.map(([weight,reps,more])=>({weight,reps,completed:true,skipped:false,...more})),...extra});
  const done=(id,date,exercises,extra={})=>({id,date,exercises,completed:true,retroactive:false,origin:'adhoc',workoutTypes:['chest'],...extra});
  const state=stateFor([]);
  state.sessions=[
    done('1','2026-09-01T10:00:00.000Z',[lift([[50,10]])]),
    done('2','2026-09-08T10:00:00.000Z',[lift([[52.5,10],[55,8],[45,12,{type:'dropset'}]])]),
    done('3','2026-09-10T10:00:00.000Z',[{...lift([[100,5]]),name:'Back Squat'}]),
    done('4','2026-09-12T10:00:00.000Z',[lift([[60,8,{skipped:true}]])]),
    done('5','2026-09-14T10:00:00.000Z',[lift([[55,9],[57.5,8]])]),
    done('6','2026-09-16T10:00:00.000Z',[lift([[57.5,8]])],{retroactive:true}),
    // The active workout, even if a stale copy reads as completed, is never its own history.
    done('7','2026-10-05T10:00:00.000Z',[lift([[70,8]])]),
  ];
  const props={workoutId:'7',exerciseName:'Bench Press',weightUnit:'kg',accent:'#00FF00'};
  const h=uiHarness('@/components/ExerciseHistory',state);
  let tree=h.render(props);
  const button=find(tree,'ExerciseActionButton');
  assert.equal(button.props.symbol,'clock.arrow.circlepath');
  assert.equal(button.props.accessibilityLabel,'Bench Press history');
  assert.equal(find(tree,'Modal').props.visible,false);
  assert.equal(nodes(tree).filter(n=>n.type?.name==='HistoryEntry').length,0,'nothing is derived until opened');
  button.props.onPress();tree=h.render(props);
  const modal=find(tree,'Modal');
  assert.equal(modal.props.visible,true);
  assert.equal(modal.props.presentationStyle,'pageSheet');
  assert.equal(modal.props.allowSwipeDismissal,true);
  assert.ok(textOf(modal).includes('Exercise history'));
  const entries=nodes(tree).filter(n=>n.type?.name==='HistoryEntry');
  assert.deepEqual(entries.map(n=>n.props.entry.sessionId),['5','2','1']);
  const newest=entries[0].type(entries[0].props);
  assert.ok(textOf(newest).includes('Sep 14'));
  const values=nodes(newest).filter(n=>n.props?.style?.[0]?.fontVariant).map(n=>textOf(n.props.children));
  assert.deepEqual(values.length,2);
  const markers=nodes(newest).filter(n=>Array.isArray(n.props?.style)&&n.props.style[0]?.width===6);
  assert.deepEqual(markers.map(n=>Boolean(n.props.style[1])),[false,true],'the heaviest set is marked');
  assert.equal(markers[1].props.style[1].backgroundColor,'#00FF00');
  assert.match(newest.props.accessibilityLabel,/57\.5 kilograms, 8 reps, best set/);
  const withDrop=entries[1].type(entries[1].props);
  assert.ok(textOf(withDrop).includes('DROP'));
  // A unit change re-renders history in the unit being logged today.
  const lbs=entries[2].type({...entries[2].props,weightUnit:'lbs'});
  assert.ok(textOf(lbs).includes('110.2'));
  assert.ok(textOf(lbs).includes('"lb"'));
  modal.props.onRequestClose();tree=h.render(props);
  assert.equal(find(tree,'Modal').props.visible,false);
});

test('History shows bodyweight, timed and weighted-timed sets in their own terms, and a calm empty state',()=>{
  const done=(id,exercise)=>({id,date:`2026-09-0${id}T10:00:00.000Z`,exercises:[exercise],completed:true,retroactive:false});
  const state=stateFor([]);
  state.sessions=[
    done('1',{name:'Pull-up',loadType:'bodyweight',metric:'reps',sets:[{weight:0,reps:12,completed:true}]}),
    done('2',{name:'Plank',loadType:'bodyweight',metric:'duration',sets:[{weight:0,reps:0,durationS:45,completed:true}]}),
    done('3',{name:'Farmer Carry',loadType:'external_weight',metric:'duration',sets:[{weight:24,reps:0,durationS:90,completed:true}]}),
  ];
  const open=name=>{
    const h=uiHarness('@/components/ExerciseHistory',state);const props={workoutId:'7',exerciseName:name,weightUnit:'kg',accent:'#fff'};
    find(h.render(props),'ExerciseActionButton').props.onPress();
    const tree=h.render(props);const entry=nodes(tree).find(n=>n.type?.name==='HistoryEntry');
    return {tree,entry:entry&&entry.type(entry.props)};
  };
  assert.ok(textOf(open('Pull-up').entry).includes('12 reps'));
  assert.ok(textOf(open('Plank').entry).includes('0:45'));
  const carry=textOf(open('Farmer Carry').entry);
  assert.ok(carry.includes('24')&&carry.includes('"kg"')&&carry.includes('· 1:30'));
  const empty=open('Pull-Up Negative');
  assert.equal(empty.entry,undefined);
  assert.ok(textOf(empty.tree).includes('No history yet'));
  assert.ok(textOf(empty.tree).includes('Pull-Up Negative'));
});
