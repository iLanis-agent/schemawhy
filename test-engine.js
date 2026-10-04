const S=require('./engine.js'),cp=require('child_process');
let seed=99;const rnd=n=>{seed=(seed*1103515245+12345)&0x7fffffff;return (seed>>8)%n};const pick=a=>a[rnd(a.length)];
const prim=()=>pick([null,true,false,0,1,1.0,2,-3,2.5,10,'','a','abc','hello','\u{1F600}x','1',[],{}]);
const inst=(d=0)=>{const k=rnd(d>=2?5:8);if(k<5)return prim();if(k<7){const n=rnd(4),a=[];for(let i=0;i<n;i++)a.push(inst(d+1));return a}const o={};['a','b','c','x1'].forEach(key=>{if(rnd(2))o[key]=inst(d+1)});return o};
const leaf=()=>{const s={};const n=rnd(3);for(let i=0;i<n;i++){const k=rnd(14);
 if(k==0)s.type=pick(['string','number','integer','boolean','null','array','object',['string','null'],['integer','string']]);
 else if(k==1)s.enum=[prim(),prim()];else if(k==2)s.const=prim();
 else if(k==3)s.minimum=pick([0,1,2.5]);else if(k==4)s.maximum=pick([0,2,10]);
 else if(k==5)s.exclusiveMinimum=pick([0,1]);else if(k==6)s.exclusiveMaximum=pick([2,10]);
 else if(k==7)s.multipleOf=pick([1,2,5,0.5]);else if(k==8)s.minLength=rnd(4);else if(k==9)s.maxLength=rnd(4);
 else if(k==10)s.pattern=pick(['a','^a','^[a-z]+$','\\d','^$','c$']);else if(k==11)s.minItems=rnd(3);
 else if(k==12)s.maxItems=rnd(3);else s.uniqueItems=true}return s};
const sch=(d=0)=>{const s=leaf();const n=rnd(d>=2?1:4);
 if(n==1&&d<2)s.properties={a:sch(d+1),b:sch(d+1)};
 if(n==2){s.required=pick([['a'],['a','b'],['c']]);if(rnd(2))s.additionalProperties=pick([false,{type:'string'}]);if(rnd(2))s.properties={a:sch(d+1)}}
 if(n==3&&d<2){const w=pick(['allOf','anyOf','oneOf']);s[w]=[sch(d+1),sch(d+1)];}
 if(rnd(6)==0&&d<2)s.items=sch(d+1);
 if(rnd(8)==0&&d<2)s.not=sch(d+1);
 if(rnd(8)==0&&d<2){s.if=sch(d+1);s.then=sch(d+1);if(rnd(2))s.else=sch(d+1)}
 if(rnd(10)==0)s.minProperties=rnd(3);if(rnd(10)==0)s.maxProperties=rnd(3);
 if(rnd(12)==0)s.patternProperties={'^x':sch(2)};
 return s};
const cases=[];for(let i=0;i<6000;i++)cases.push([sch(),inst()]);
const o=JSON.parse(cp.execFileSync('python3',['oracle.py'],{input:JSON.stringify(cases),maxBuffer:1e9}));
let bad=0,inv=0;
cases.forEach(([s,x],i)=>{let m;try{m=S.check(s,x)}catch(e){m=[{path:'!',keyword:'THROW '+e.message}]}
 const mine=[...new Set(m.map(e=>e.path+'\u0000'+e.keyword))].sort().map(k=>k.split('\u0000'));
 const py=o[i].map(e=>[e[0],e[1]]).sort((a,b)=>(a[0]+a[1]).localeCompare(b[0]+b[1]));
 const m2=mine.sort((a,b)=>(a[0]+a[1]).localeCompare(b[0]+b[1]));
 if(m2.length)inv++;
 if(JSON.stringify(m2)!==JSON.stringify(py)){bad++;if(bad<=12)console.log('MISMATCH',JSON.stringify(s),JSON.stringify(x),JSON.stringify(m2),JSON.stringify(py))}});
console.log('checks',cases.length,'mismatches',bad,'cases with errors',inv);process.exit(bad?1:0);
