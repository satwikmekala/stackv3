/* global __dirname */
// Execute production screen/component render functions and event handlers with
// mocked native primitives. This verifies branching/handlers, not device layout.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');

function uiHarness(entry, state, params = {}, catalog = []) {
  let cursor = 0, dirty = false;
  const hooks = [], effects = [], events = [], cache = new Map();
  const chain = new Proxy(function () { return chain; }, { get: () => chain });
  const element = (type, props, ...children) => ({ type, props: { ...props, children } });
  const react = {
    createElement: element, Fragment: 'Fragment',
    useState(initial) { const i=cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial;
      return [hooks[i], value => { const next=typeof value==='function'?value(hooks[i]):value; if(next!==hooks[i]) {hooks[i]=next;dirty=true;} }]; },
    useRef(value) { const i=cursor++; return hooks[i] ?? (hooks[i]={current:value}); },
    useMemo(fn,deps) { const i=cursor++; if(!hooks[i] || deps?.some((v,j)=>v!==hooks[i].deps[j]))hooks[i]={deps,value:fn()};return hooks[i].value; },
    useCallback(fn,deps) { return react.useMemo(()=>fn,deps); },
    useEffect(fn,deps) { const i=cursor++; if(!hooks[i] || deps?.some((v,j)=>v!==hooks[i][j])) { hooks[i]=deps;effects.push(fn); } },
  };
  const store=fn=>fn(state);store.getState=()=>state;
  const native = new Proxy({
    Platform:{OS:'web'}, Alert:{alert:(...args)=>events.push(['alert',...args])},
    BackHandler:{addEventListener:()=>({remove(){}})},
    useWindowDimensions:()=>({width:390,height:844}),
    StyleSheet:{create:x=>x}, Animated:{Value:class {setValue(){}},timing:chain,spring:chain,View:'Animated.View'},
    PanResponder:{create:()=>({panHandlers:{}})},
  },{get:(o,k)=>o[k]??String(k)});
  const reanimated = new Proxy({__esModule:true,default:{View:'Animated.View',createAnimatedComponent:x=>x},
    useSharedValue:x=>({value:x}),useAnimatedStyle:()=>({}),withTiming:x=>x,
  },{get:(o,k)=>o[k]??chain});
  function load(id) {
    if (id==='react') return {...react,default:react,__esModule:true};
    if (id==='react-native') return native;
    if (id==='react-native-reanimated') return reanimated;
    if (id==='expo-router') return {useLocalSearchParams:()=>params,useNavigation:()=>({setOptions(){}}),useRouter:()=>({back:()=>events.push(['back']),replace:(x)=>events.push(['replace',x]),setParams:x=>Object.assign(params,x),canGoBack:()=>true})};
    if (id==='react-native-safe-area-context') return {useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})};
    if (id==='@/store/workoutStore') return {useWorkoutStore:store};
    if (id==='@/store/workoutDatabase') return {readExerciseCatalogSync:()=>catalog};
    if (id==='@/constants/exerciseInfo') return {getExerciseInfo:()=>null};
    if (id==='@/hooks/usePressScale') return {usePressScale:()=>({})};
    if (id==='@/components/BonusSet') return new Proxy({BONUS_SET_META:{extra:{color:'#aaa'},dropset:{color:'#aaa'},pr:{color:'#aaa'}}},{get:(o,k)=>o[k]??String(k)});
    if (id.startsWith('@/components/') && id!==entry) return new Proxy({},{get:(_,k)=>String(k)});
    if (id==='@/store/customSplitDraft') return {CUSTOM_SPLIT_MUSCLE_GROUPS:['Chest','Biceps'],getMuscleGroupForExercise:e=>e.primaryMuscle,getWorkoutTypeForMuscleGroup:g=>g==='Chest'?'chest':'arms'};
    if(id.endsWith('.css'))return {};
    if (!id.startsWith('@/') && !id.startsWith('.')) return new Proxy({},{get:(_,k)=>String(k)});
    const file=path.join(root,id.replace(/^@\//,'').replace(/^\.\.\//,''));
    const resolved=['.tsx','.ts'].map(ext=>file+ext).find(f=>fs.existsSync(f));
    if(cache.has(resolved))return cache.get(resolved);
    const exports={};cache.set(resolved,exports);
    const code=ts.transpileModule(fs.readFileSync(resolved,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
    new Function('exports','require','React','__DEV__',code)(exports,child=>load(child.startsWith('.')? '@/'+path.relative(root,path.resolve(path.dirname(resolved),child)):child),react,false);
    return exports;
  }
  const component=Object.values(load(entry)).find(v=>typeof v==='function');
  return {events,render(props={}) {let tree;for(let i=0;i<5;i++){cursor=0;dirty=false;tree=component(props);while(effects.length)effects.shift()();if(!dirty)break;}return tree;}};
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

test('Adhoc UI: empty logger safely mounts only empty content and add picker; minimize retains session',()=>{
  const state=stateFor();const h=uiHarness('@/app/workout',state);
  let tree=h.render();
  for(const label of ['Workout','Empty workout','Add your first exercise','Add Exercise'])assert.ok(textOf(tree).includes(label));
  for(const type of ['ActiveSetCard','ExerciseFinisher','WorkoutIntensityPicker'])assert.equal(find(tree,type),undefined);
  assert.equal(find(tree,'SwapExerciseSheet').props.mode,'add');
  nodes(tree).find(n=>n.props?.onPress && textOf(n).includes('Add Exercise') && n.type==='WorkoutTouchable').props.onPress();
  tree=h.render();assert.equal(find(tree,'SwapExerciseSheet').props.visible,true);
  find(tree,'WorkoutMinimizeSurface').props.onMinimize();
  assert.equal(state.currentSession.id,'7');assert.equal(h.events.at(-1)[0],'back');
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

test('Adhoc UI: all-skipped finisher disables finish but still offers another exercise',()=>{
  const item=exercise();item.sets[0].skipped=true;
  const h=uiHarness('@/app/workout',stateFor([item]));const tree=h.render();
  const props=find(tree,'ExerciseFinisher').props;assert.equal(props.canFinish,false);assert.equal(typeof props.onAddAnother,'function');
  const finisher=uiHarness('@/components/ExerciseFinisher',{}).render(props);
  assert.ok(textOf(finisher).includes('Add another exercise'));assert.ok(textOf(finisher).includes('Finish workout'));
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
