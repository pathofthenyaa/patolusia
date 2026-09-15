
(()=>{const KEY="minigamesTheme";let theme=localStorage.getItem(KEY)||"auto";const btn=document.querySelector("[data-theme-button]");
function apply(t){theme=t;document.documentElement.dataset.theme=t;localStorage.setItem(KEY,t);if(btn){btn.textContent={auto:"◐",light:"☀",dark:"☾"}[t];btn.title="Motyw: "+({auto:"Auto",light:"Jasny",dark:"Ciemny"}[t])}}
apply(theme);if(btn)btn.addEventListener("click",()=>{const a=["auto","light","dark"];apply(a[(a.indexOf(theme)+1)%3])});
if("serviceWorker"in navigator)window.addEventListener("load",async()=>{try{const r=await navigator.serviceWorker.register((location.pathname.includes("/games/")?"../":"")+"service-worker.js",{updateViaCache:"none"});r.update()}catch(e){}});
})();
