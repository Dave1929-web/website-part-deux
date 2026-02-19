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
});
