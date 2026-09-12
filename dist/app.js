function fitReference(){const root=document.querySelector("#mainContainerSite");root.style.width=innerWidth<992?"1265px":"";root.style.zoom=innerWidth<992?String(innerWidth/1265):"";}fitReference();window.addEventListener("resize",fitReference);

const dialog=document.createElement('dialog');dialog.id='preview-dialog';document.body.append(dialog);
document.querySelectorAll('.swiper-container').forEach(container=>{
 const track=container.querySelector('.swiper-wrapper');if(!track)return;
 const slides=[...track.children];const hero=!!container.closest('#homeBannerPrincipal');
 if(hero)slides.sort((a,b)=>(+a.dataset.swiperSlideIndex||0)-(+b.dataset.swiperSlideIndex||0)).forEach(s=>track.append(s));
 let index=0;function render(){const width=container.clientWidth;const card=hero?width:(width<600?width/2:parseFloat(slides[0]?.style.width)||width/4);slides.forEach(s=>s.style.width=card+'px');track.style.transform='translate3d('+(-index*card)+'px,0,0)';track.style.transition='transform .35s';container.querySelectorAll('.swiper-pagination-bullet').forEach((b,i)=>{b.classList.toggle('swiper-pagination-bullet-active',i===index);b.setAttribute('aria-current',i===index?'true':'false')});}
 function move(d){index=(index+d+slides.length)%slides.length;render();}
 container.querySelector('.swiper-button-next')?.addEventListener('click',()=>move(1));container.querySelector('.swiper-button-prev')?.addEventListener('click',()=>move(-1));container.querySelectorAll('.swiper-pagination-bullet').forEach((b,i)=>{b.addEventListener('click',()=>{index=i;render()})});window.addEventListener('resize',render);render();
});
document.querySelectorAll('img').forEach(i=>{if(/\/upload\/banner\/$/.test(i.src))i.style.display='none'});
function show(title,text){dialog.replaceChildren();const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=text;const b=document.createElement('button');b.textContent='Continuar navegando';b.onclick=()=>dialog.close();dialog.append(h,p,b);dialog.showModal();}
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
document.addEventListener('click',e=>{
const arrow=e.target.closest('.slick-arrow');if(arrow){const slider=arrow.closest('.slick-slider');const track=slider?.querySelector('.slick-track');if(track){const slides=[...track.children];const first=slides.find(s=>s.getAttribute('aria-hidden')==='false')||slides[0];const width=first?.getBoundingClientRect().width||300;let x=+(track.dataset.offset||0)+(arrow.classList.contains('slick-prev')?width:-width);const limit=Math.max(0,track.scrollWidth-slider.clientWidth);if(x < -limit)x=0;if(x>0)x=-limit;track.dataset.offset=x;track.style.transform='translate3d('+x+'px,0,0)';track.style.transition='transform .35s';}return;}

});
