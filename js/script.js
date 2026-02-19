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

  // Hero constellation hover effect
  (function heroConstellation(){
    const hero = document.getElementById('hero');
    const canvas = document.getElementById('constellation');
    if(!hero || !canvas) return;

    const context = canvas.getContext('2d');
    if(!context) return;

    let width = 0;
    let height = 0;
    const points = [];
    const maxPoints = 20;
    const linkDistance = 110;

    function resizeCanvas(){
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = width;
      canvas.height = height;
    }

    function addPoint(x, y){
      points.push({ x, y, life: 1 });
      if(points.length > maxPoints) points.shift();
    }

    function draw(){
      context.clearRect(0, 0, width, height);

      for(let i = 0; i < points.length; i++){
        const point = points[i];
        point.life -= 0.018;
      }

      for(let i = points.length - 1; i >= 0; i--){
        if(points[i].life <= 0) points.splice(i, 1);
      }

      for(let i = 0; i < points.length; i++){
        const first = points[i];

        context.beginPath();
        context.fillStyle = `rgba(176, 220, 255, ${Math.max(first.life, 0)})`;
        context.arc(first.x, first.y, 1.8, 0, Math.PI * 2);
        context.fill();

        for(let j = i + 1; j < points.length; j++){
          const second = points[j];
          const dx = first.x - second.x;
          const dy = first.y - second.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if(distance > linkDistance) continue;

          const opacity = ((linkDistance - distance) / linkDistance) * Math.min(first.life, second.life) * 0.9;
          context.beginPath();
          context.strokeStyle = `rgba(120, 210, 255, ${opacity})`;
          context.lineWidth = 1;
          context.moveTo(first.x, first.y);
          context.lineTo(second.x, second.y);
          context.stroke();
        }
      }

      requestAnimationFrame(draw);
    }

    let lastPointTime = 0;
    hero.addEventListener('pointermove', function(event){
      const now = performance.now();
      if(now - lastPointTime < 30) return;
      lastPointTime = now;

      const bounds = hero.getBoundingClientRect();
      addPoint(event.clientX - bounds.left, event.clientY - bounds.top);
    });

    hero.addEventListener('pointerleave', function(){
      points.length = 0;
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    requestAnimationFrame(draw);
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
