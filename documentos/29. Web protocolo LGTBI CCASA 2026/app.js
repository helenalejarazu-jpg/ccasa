const pages=[...document.querySelectorAll('[data-page]')];
const menu=document.querySelector('.menu');
const sidebar=document.querySelector('.sidebar');
function render(){
 if(location.hash==='#contenido'){document.getElementById('contenido').tabIndex=-1;document.getElementById('contenido').focus();return;}
 const parts=location.hash.slice(1).split('/');
 const key=parts[0]||'portada';
 const all=key==='texto-completo';
 const valid=all||pages.some(p=>p.id===key);
 if(!valid){location.replace('#portada');return;}
 document.body.classList.toggle('all-text',all);
 pages.forEach(p=>{p.hidden=all?p.id==='portada':p.id!==key;});
 document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+key)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 sidebar.classList.remove('open');menu.setAttribute('aria-expanded','false');
 document.querySelectorAll('details.full').forEach(d=>d.open=false);
 const page=document.getElementById(key);
 if(page&&parts[1]==='texto'){page.querySelector('details.full').open=true;}
 document.title=(all?'Texto completo':page?.dataset.title||'Protocolo')+' · CCASA';
 window.scrollTo(0,0);
 const focus=page?.querySelector('h1');if(focus){focus.tabIndex=-1;focus.focus({preventScroll:true});}
 if(page&&parts[1]==='texto'){page.querySelector('details.full').scrollIntoView({block:'start'});}
 if(parts[2]){document.getElementById(parts[2])?.scrollIntoView({block:'start'});}
}
menu.addEventListener('click',()=>{const open=sidebar.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){sidebar.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.focus();}});
window.addEventListener('hashchange',render);
render();
