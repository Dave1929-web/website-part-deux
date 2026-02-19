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
    const maxPoints = 12;
    const linkDistance = 95;

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
        point.life -= 0.010;
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
      if(now - lastPointTime < 55) return;
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

  // Scroll-triggered planet rotation
  (function planetRotation(){
    const planets = document.querySelectorAll('.planet-orbit');
    if(!planets.length) return;
    window.addEventListener('scroll', ()=>{
      const scrollY = window.scrollY;
      planets.forEach((orbit, i)=>{
        const speed = [2.5, 3, 1.8][i];
        orbit.style.transform = `rotate(${scrollY * speed}deg)`;
      });
    });
  })();

  // Interactive constellation builder
  (function constellationBuilder(){
    let isBuilding = false;
    let selectedStars = [];
    const lines = [];
    
    window.toggleConstellation = function(){
      isBuilding = !isBuilding;
      document.body.classList.toggle('constellation-mode', isBuilding);
      selectedStars = [];
      lines.forEach(line => line.remove());
      lines.length = 0;
    };

    document.addEventListener('click', (e)=>{
      if(!isBuilding) return;
      
      // Check if click is on a star (estimated position from starfield)
      const x = e.clientX;
      const y = e.clientY;
      
      // Create clickable star zones
      const starZones = [
        {x: 20, y: 30}, {x: 120, y: 200}, {x: 220, y: 60},
        {x: 340, y: 300}, {x: 480, y: 120}, {x: 620, y: 20},
        {x: 720, y: 240}, {x: 820, y: 80}, {x: 940, y: 340},
        {x: 1040, y: 160}, {x: 1240, y: 480}
      ];
      
      for(let zone of starZones){
        const sx = (zone.x / 1600) * window.innerWidth;
        const sy = (zone.y / 1000) * window.innerHeight;
        const dist = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2);
        
        if(dist < 30){
          selectedStars.push({x: sx, y: sy});
          
          if(selectedStars.length >= 2){
            const prev = selectedStars[selectedStars.length - 2];
            const cur = selectedStars[selectedStars.length - 1];
            drawConstellation(prev, cur);
          }
          
          if(selectedStars.length >= 8){
            selectedStars = [];
            lines.forEach(l => l.remove());
            lines.length = 0;
          }
          return;
        }
      }
    });
    
    function drawConstellation(from, to){
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      const line = document.createElement('div');
      line.className = 'constellation-line';
      line.style.left = from.x + 'px';
      line.style.top = from.y + 'px';
      line.style.width = dist + 'px';
      line.style.height = '2px';
      line.style.transform = `rotate(${angle}deg)`;
      line.style.transformOrigin = '0 50%';
      document.body.appendChild(line);
      lines.push(line);
    }
  })();
});
