/* Errands Reminder: local-first checklist and foreground reminder scheduler. */
(() => {
  'use strict';
  const STORAGE_KEY = 'errands-reminder.tasks.v1';
  const SETTINGS_KEY = 'errands-reminder.settings.v1';
  const REMINDER_KEY = 'errands-reminder.sent.v1';
  const $ = (selector) => document.querySelector(selector);
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const uid = () => (globalThis.crypto?.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const safeRead = (key, fallback) => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
  let tasks = safeRead(STORAGE_KEY, null);
  if (!Array.isArray(tasks)) {
    tasks = [
      {id:uid(),title:'Buy hardware at Ace Hardware',notes:'',date:todayISO(),time:'',completed:false,createdAt:Date.now()},
      {id:uid(),title:"Return core battery to O'Reilly Auto Parts",notes:'',date:todayISO(),time:'',completed:false,createdAt:Date.now()+1},
      {id:uid(),title:"Buy replacement battery at O'Reilly Auto Parts",notes:'',date:todayISO(),time:'',completed:false,createdAt:Date.now()+2}
    ];
    saveTasks();
  }
  let settings = safeRead(SETTINGS_KEY, {theme:'light',completedOpen:true});
  let sentReminders = safeRead(REMINDER_KEY, {});
  const dialog = $('#taskDialog');
  let toastTimer;

  function saveTasks(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
  function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function saveSent(){ localStorage.setItem(REMINDER_KEY, JSON.stringify(sentReminders)); }
  function escapeText(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function formatDate(date){
    if (!date) return '';
    const d = new Date(`${date}T12:00:00`);
    return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  }
  function formatTime(time){
    if (!time) return '';
    const [h,m] = time.split(':').map(Number);
    return new Date(2000,0,1,h,m).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
  }
  function dueTimestamp(task){
    if (!task.date) return null;
    const [y,m,d] = task.date.split('-').map(Number);
    const [h,min] = (task.time || '23:59').split(':').map(Number);
    return new Date(y,m-1,d,h,min,0,0).getTime();
  }
  function isOverdue(task){ return !task.completed && !!task.date && dueTimestamp(task) < Date.now(); }
  function createTaskCard(task){
    const card = document.createElement('article');
    card.className = `task-card${task.completed?' is-complete':''}`;
    const dueText = task.date ? `${escapeText(formatDate(task.date))}${task.time ? ` · ${escapeText(formatTime(task.time))}` : ''}` : '';
    const meta = [dueText ? `<span class="meta-item">◷ ${dueText}</span>` : '', task.time ? '<span class="meta-item">🔔 Reminder</span>' : '', isOverdue(task) ? '<span class="overdue-badge">OVERDUE</span>' : ''].filter(Boolean).join('');
    card.innerHTML = `<label class="check-wrap" aria-label="Mark ${escapeText(task.title)} complete"><input class="task-check" type="checkbox" ${task.completed?'checked':''} aria-label="Complete task"></label>
      <div class="task-body"><div class="task-title">${escapeText(task.title)}</div>${task.notes?`<div class="task-notes">${escapeText(task.notes)}</div>`:''}${meta?`<div class="task-meta">${meta}</div>`:''}</div>
      <div class="task-actions"><button class="small-action edit-task" type="button" aria-label="Edit task" title="Edit">✎</button><button class="small-action delete-task" type="button" aria-label="Delete task" title="Delete">×</button></div>`;
    card.querySelector('.task-check').addEventListener('change', e => {task.completed=e.target.checked;if(task.completed)task.completedAt=Date.now();else delete task.completedAt;saveTasks();render();if(task.completed) toast('Task completed');});
    card.querySelector('.edit-task').addEventListener('click',()=>openEditor(task));
    card.querySelector('.delete-task').addEventListener('click',()=>{tasks=tasks.filter(t=>t.id!==task.id);saveTasks();render();toast('Task deleted');});
    return card;
  }
  function renderList(element, list, empty){
    element.replaceChildren();
    if(!list.length){const state=document.createElement('div');state.className='empty-state';state.textContent=empty;element.append(state);return;}
    list.forEach(task=>element.append(createTaskCard(task)));
  }
  function render(){
    const today=todayISO();
    const pending=tasks.filter(t=>!t.completed);
    const todayTasks=pending.filter(t=>!t.date||t.date<=today).sort((a,b)=>(a.date||today).localeCompare(b.date||today)||(a.createdAt||0)-(b.createdAt||0));
    const upcoming=pending.filter(t=>t.date&&t.date>today).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||''));
    const completed=tasks.filter(t=>t.completed).sort((a,b)=>(b.completedAt||b.createdAt||0)-(a.completedAt||a.createdAt||0));
    renderList($('#todayTasks'),todayTasks,'You’re all clear for today. Add a task whenever you need one.');
    renderList($('#upcomingTasks'),upcoming,'Nothing scheduled for later yet.');
    renderList($('#completedTasks'),completed,'Completed tasks will show up here.');
    $('#todayCount').textContent=todayTasks.length;$('#upcomingCount').textContent=upcoming.length;$('#completedCount').textContent=completed.length;
    const doneToday=tasks.filter(t=>t.completed&&(!t.date||t.date<=today)).length;
    const total=todayTasks.length+doneToday;
    $('#progressText').textContent=`${doneToday} of ${total}`;
    $('#progressBar').style.width=`${total?Math.min(100,doneToday/total*100):0}%`;
    $('#todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
    $('#completedTasks').parentElement.classList.toggle('collapsed',!settings.completedOpen);
    $('#completedToggle').setAttribute('aria-expanded',String(settings.completedOpen));
  }
  function openEditor(task=null){
    $('#taskForm').reset();$('#taskId').value=task?.id||'';
    $('#dialogTitle').textContent=task?'Edit task':'Add a task';
    $('#taskTitle').value=task?.title||'';$('#taskNotes').value=task?.notes||'';$('#taskDate').value=task?.date||'';$('#taskTime').value=task?.time||'';
    dialog.showModal();setTimeout(()=>$('#taskTitle').focus(),30);
  }
  $('#taskForm').addEventListener('submit',e=>{
    e.preventDefault();const id=$('#taskId').value;const existing=tasks.find(t=>t.id===id);
    const task={...(existing||{id:uid(),completed:false,createdAt:Date.now()}),title:$('#taskTitle').value.trim(),notes:$('#taskNotes').value.trim(),date:$('#taskDate').value,time:$('#taskTime').value};
    if(!task.title)return;
    if(existing){Object.assign(existing,task);delete sentReminders[id];saveSent();}else tasks.push(task);
    saveTasks();render();dialog.close();toast(existing?'Task updated':'Task added');
    if(task.time) requestNotificationPermission();
  });
  $('#addTaskButton').addEventListener('click',()=>openEditor());
  $('#cancelDialog').addEventListener('click',()=>dialog.close());$('#closeDialog').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  $('#completedToggle').addEventListener('click',()=>{settings.completedOpen=!settings.completedOpen;saveSettings();render();});
  function applyTheme(){document.documentElement.dataset.theme=settings.theme;$('#themeIcon').textContent=settings.theme==='dark'?'☀':'☾';$('#themeToggle').setAttribute('aria-label',settings.theme==='dark'?'Switch to light mode':'Switch to dark mode');document.querySelector('meta[name="theme-color"]').content=settings.theme==='dark'?'#171821':'#f5f6fa';}
  $('#themeToggle').addEventListener('click',()=>{settings.theme=settings.theme==='dark'?'light':'dark';saveSettings();applyTheme();});
  function toast(message){const node=$('#toast');node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2200);}

  async function requestNotificationPermission(){
    if(!('Notification' in window)){updateNotificationStatus();return;}
    if(Notification.permission==='default'){
      try{await Notification.requestPermission();}catch{/* Permission prompt may be unavailable until a user gesture. */}
    }
    updateNotificationStatus();
  }
  function updateNotificationStatus(){
    const banner=$('#notificationBanner'),status=$('#notificationStatus'),action=$('#notificationAction');
    if(!('Notification' in window)){status.textContent='Notifications are not supported in this browser.';action.hidden=true;banner.className='notification-banner denied';return;}
    action.hidden=false;
    if(Notification.permission==='granted'){status.textContent='Notifications are enabled on this device.';action.textContent='Enabled';action.disabled=true;banner.className='notification-banner granted';}
    else if(Notification.permission==='denied'){status.textContent='Notifications are blocked. Change this site’s browser settings to enable them.';action.textContent='Blocked';action.disabled=true;banner.className='notification-banner denied';}
    else{status.textContent='Enable notifications to receive task reminders while Errands Reminder is open.';action.textContent='Enable';action.disabled=false;banner.className='notification-banner';}
  }
  $('#notificationAction').addEventListener('click',requestNotificationPermission);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReminders();});
  window.addEventListener('focus',checkReminders);
  function taskNotificationText(task){return task.notes?`${task.title} — ${task.notes}`:task.title;}
  async function sendNotification(task){
    const options={body:taskNotificationText(task),tag:`errands-${task.id}`,data:{taskId:task.id,url:'./'}};
    try{
      const registration=await navigator.serviceWorker?.getRegistration();
      if(registration) await registration.showNotification('Errands Reminder',options);
      else new Notification('Errands Reminder',options);
      sentReminders[task.id]=Date.now();saveSent();
    }catch(error){console.warn('Could not show reminder notification:',error);}
  }
  function checkReminders(){
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    const now=Date.now();
    for(const task of tasks){
      if(task.completed||!task.date||!task.time||sentReminders[task.id])continue;
      const due=dueTimestamp(task);
      if(due<=now&&now-due<24*60*60*1000)sendNotification(task);
    }
  }
  // The app checks due reminders while open; browser timers are not guaranteed after it closes.
  setInterval(checkReminders,15000);
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./service-worker.js').then(()=>checkReminders()).catch(err=>console.warn('Service worker registration failed:',err));}
  applyTheme();render();updateNotificationStatus();
  // Ask on first run when possible. Browsers requiring a gesture will leave the Enable action available.
  if('Notification' in window&&Notification.permission==='default')setTimeout(requestNotificationPermission,800);
})();
