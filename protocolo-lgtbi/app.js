document.documentElement.classList.add('js');
(function(){const o=document.getElementById('descargar-original');if(o)document.querySelectorAll('a[data-descarga]').forEach(a=>{a.href=o.href;});})();
const pages=[...document.querySelectorAll('[data-page]')];
const menu=document.querySelector('.menu');
const sidebar=document.querySelector('.sidebar');
function render(){
 if(location.hash==='#contenido'){document.getElementById('contenido').tabIndex=-1;document.getElementById('contenido').focus();return;}
 if(location.hash==='#navegacion'){sidebar.classList.add('open');menu.setAttribute('aria-expanded','true');return;}
 const parts=decodeURIComponent(location.hash.slice(1)).split('/');
 let key=parts[0]||'portada';
 let target=parts[2]?document.getElementById(parts[2]):null;
 const all=key==='texto-completo';
 if(!all&&!pages.some(p=>p.id===key)){
  const el=document.getElementById(key);const pg=el&&el.closest('[data-page]');
  if(pg){target=el;key=pg.id;}else{location.replace('#portada');return;}
 }
 document.body.classList.toggle('all-text',all);
 pages.forEach(p=>{p.hidden=all?p.id==='portada':p.id!==key;});
 document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+key)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 sidebar.classList.remove('open');menu.setAttribute('aria-expanded','false');
 document.querySelectorAll('details.full').forEach(d=>d.open=all);
 const page=document.getElementById(key);
 if(page&&parts[1]==='texto'&&!target){page.querySelector('details.full').open=true;}
 const det=target&&target.closest('details');if(det)det.open=true;
 document.title=(all?'Texto completo':(page&&page.dataset.title)||'Protocolo')+' · CCASA';
 window.scrollTo(0,0);
 const focus=page&&page.querySelector('h1');if(focus){focus.tabIndex=-1;focus.focus({preventScroll:true});}
 if(page&&parts[1]==='texto'&&!target){page.querySelector('details.full').scrollIntoView({block:'start'});}
 if(target){target.scrollIntoView({block:'start'});}
}
menu.addEventListener('click',e=>{e.preventDefault();const open=sidebar.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){sidebar.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.focus();}});
window.addEventListener('hashchange',render);
render();
