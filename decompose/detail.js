const html = document.documentElement;
const btn  = document.getElementById('themeToggle');
const icon = document.getElementById('themeIcon');
const lbl  = document.getElementById('themeLabel');
if (localStorage.getItem('theme') === 'light') applyLight();
btn.addEventListener('click', () => { html.classList.contains('light') ? applyDark() : applyLight(); });
function applyLight() { html.classList.add('light'); icon.textContent='🌙'; lbl.textContent='Dark'; localStorage.setItem('theme','light'); }
function applyDark() { html.classList.remove('light'); icon.textContent='☀️'; lbl.textContent='Light'; localStorage.setItem('theme','dark'); }
