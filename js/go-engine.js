window.GoEngine=(()=>{
function ns(i,n){let r=Math.floor(i/n),c=i%n,a=[];if(r)a.push(i-n);if(r<n-1)a.push(i+n);if(c)a.push(i-1);if(c<n-1)a.push(i+1);return a}
function group(start,a,n){let col=a[start],seen=new Set([start]),st=[start],libs=new Set();while(st.length){let i=st.pop();for(let j of ns(i,n)){if(a[j]===0)libs.add(j);else if(a[j]===col&&!seen.has(j)){seen.add(j);st.push(j)}}}return{stones:[...seen],libs}}
function simulate(b,n,previous,i,col){if(b[i])return null;let a=b.slice();a[i]=col;let cap=0;for(let j of ns(i,n))if(a[j]&&a[j]!==col){let g=group(j,a,n);if(!g.libs.size){cap+=g.stones.length;g.stones.forEach(x=>a[x]=0)}}let own=group(i,a,n);if(!own.libs.size||a.join("")===previous)return null;return{a,cap,libs:own.libs.size}}
function evaluate(b,n,previous,i,col=2){let s=simulate(b,n,previous,i,col);if(!s)return null;let enemy=3-col,own=group(i,s.a,n),N=ns(i,n),friends=N.filter(j=>b[j]===col).length,enemies=N.filter(j=>b[j]===enemy).length,saved=0,attack=0,seen=new Set(),fg=0;
for(let j of N)if(b[j]===col&&!seen.has(j)){let g=group(j,b,n);fg++;g.stones.forEach(x=>seen.add(x));if(g.libs.size<=2&&g.libs.has(i)){let x=g.stones.find(x=>s.a[x]===col);if(x!==undefined){let ag=group(x,s.a,n);saved+=Math.max(0,ag.libs.size-g.libs.size)*g.stones.length}}}
seen.clear();for(let j of N)if(b[j]===enemy&&!seen.has(j)){let g=group(j,b,n);g.stones.forEach(x=>seen.add(x));let x=g.stones.find(x=>s.a[x]===enemy);if(x!==undefined){let ag=group(x,s.a,n);if(ag.libs.size===1)attack+=10+g.stones.length*3;else if(ag.libs.size<g.libs.size)attack+=(g.libs.size-ag.libs.size)*3}}
let r=Math.floor(i/n),c=i%n,edge=Math.min(r,c,n-1-r,n-1-c),score=s.cap*35+own.libs.size*3+saved*7+attack+Math.max(0,fg-1)*4+Math.min(edge,3)*.25;
if(friends&&enemies===0&&!s.cap&&!saved&&!attack)score-=friends*1.5;let desperate=own.libs.size===1&&!s.cap&&!saved;if(desperate)score-=40;
return{i,score,desperate,cap:s.cap,saved,attack,libs:own.libs.size}}
function rank(b,n,previous,col=2){let a=[];for(let i=0;i<b.length;i++){let m=evaluate(b,n,previous,i,col);if(m)a.push(m)}return a.sort((x,y)=>y.score-x.score)}
function choose(moves,level){let a=moves.slice(0,10);if(!a.length)return null;let bands={calm:[6,5],normal:[4,3],clever:[2,1]},band=bands[level]||bands.normal,scale=k=>Math.min(a.length-1,Math.round(k*(a.length-1)/9)),pool=[...new Set(band.map(scale))].map(k=>a[k]).filter(Boolean);return pool[Math.floor(Math.random()*pool.length)]||a[0]}
return{ns,group,simulate,rank,choose}
})();