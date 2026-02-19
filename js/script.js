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
      const startX = Math.floor(window.innerWidth * (0.15 + Math.random()*0.8));
      const startY = Math.floor(window.innerHeight * (0.02 + Math.random()*0.2));
      star.style.left = startX + 'px';
      star.style.top = startY + 'px';
      const dur = 900 + Math.floor(Math.random()*900);
      star.style.animation = `shoot ${dur}ms linear forwards`;
      container.appendChild(star);
      setTimeout(()=> star.remove(), dur + 200);
    }

    function createComet(){
      const c = document.createElement('div');
      c.className = 'comet';
      const startX = Math.floor(window.innerWidth * (0.3 + Math.random()*0.6));
      const startY = Math.floor(window.innerHeight * (0.01 + Math.random()*0.15));
      c.style.left = startX + 'px';
      c.style.top = startY + 'px';
      const dur = 1600 + Math.floor(Math.random()*1800);
      c.style.animation = `cometMove ${dur}ms linear forwards`;
      container.appendChild(c);
      setTimeout(()=> c.remove(), dur + 200);
    }

    // create stars more often, comets rarely
    setInterval(()=>{
      const r = Math.random();
      if(r < 0.12) createComet();
      else if(r < 0.75) createStar();
    }, 600);
  })();
});
