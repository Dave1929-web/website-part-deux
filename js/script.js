document.addEventListener('DOMContentLoaded',function(){
  const form=document.getElementById('contactForm');
  const status=document.getElementById('status');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    const data=new FormData(form);
    status.textContent='Thanks, message received (demo).';
    status.style.color='green';
    form.reset();
  });

  // Rotating quotes
  (function rotateQuotes(){
    const quotes = Array.from(document.querySelectorAll('#quotes .quote'));
    if(!quotes.length) return;
    let i=0; quotes[i].classList.add('active');
    setInterval(()=>{
      quotes[i].classList.remove('active');
      i = (i+1) % quotes.length;
      quotes[i].classList.add('active');
    }, 4500);
  })();

  // Shooting stars generator
  (function shootingStars(){
    const container = document.body;
    function createStar(){
      const star = document.createElement('div');
      star.className = 'shooting-star';
      const startX = Math.floor(window.innerWidth * (0.2 + Math.random()*0.8));
      const startY = Math.floor(window.innerHeight * (0.05 + Math.random()*0.25));
      star.style.left = startX + 'px';
      star.style.top = startY + 'px';
      const dur = 1200 + Math.floor(Math.random()*900);
      star.style.animation = `shoot ${dur}ms linear forwards`;
      container.appendChild(star);
      setTimeout(()=> star.remove(), dur + 50);
    }
    // create occasional bursts
    setInterval(()=>{ if(Math.random() < 0.7) createStar(); }, 800);
  })();
});
