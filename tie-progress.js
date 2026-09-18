/* The Independent Executive - shared lesson progress + gate for lesson pages.
   Reuses the same Supabase project + progress table as the Build workspace.
   A completed lesson is a progress row with doc_key = "lesson:<file>". */
(function(){
  var SUPABASE_URL="https://rmjlslgfrflbqkwxtidm.supabase.co";
  var SUPABASE_ANON_KEY="sb_publishable_3ooOi3enMiJZpEV6em-Hmw_GmjNmO0f";
  var COACH_DOMAIN="@vmleader.com";

  function lessonId(){var p=(location.pathname.split('/').pop()||'').replace(/\.html?$/i,'');return p||'index';}
  function lessonTitle(){var h=document.querySelector('.hero h1');return h?h.textContent.trim():document.title;}
  function lessonTrack(){var e=document.querySelector('.hero .eyebrow');return e?e.textContent.trim():'';}

  function loadSb(cb){
    if(window.supabase)return cb();
    var s=document.createElement('script');
    s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload=function(){cb();};s.onerror=function(){cb('err');};
    document.head.appendChild(s);
  }

  function gate(email){
    var d=document.createElement('div');
    d.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(8,30,43,.75);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,-apple-system,sans-serif";
    d.innerHTML='<div style="background:#fff;border-radius:16px;max-width:430px;width:100%;padding:30px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)">'
      +'<img src="https://vmleader.com/vm-icon.png" alt="" style="width:42px;height:42px;margin-bottom:10px">'
      +'<h2 style="font-family:\'DM Serif Display\',Georgia,serif;font-weight:400;color:#081e2b;margin:0 0 8px;font-size:24px">Members only</h2>'
      +'<p style="color:#42566a;font-size:14.5px;line-height:1.6;margin:0 0 20px">'
        +(email?('We don\'t see <b>'+email+'</b> on the member list yet. If this is a mistake, contact support@vmleader.com.')
               :'This lesson is for enrolled members. Sign in on your dashboard, then reopen the lesson.')
      +'</p>'
      +'<a href="index.html" style="display:inline-block;background:linear-gradient(135deg,#20a7e6,#0575ab);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:100px">Go to your dashboard &rarr;</a>'
      +'</div>';
    document.body.appendChild(d);
    document.body.style.overflow='hidden';
  }

  function injectButton(sb,me,done){
    var host=document.querySelector('.content')||document.querySelector('.wrap')||document.body;
    var wrap=document.createElement('div');
    wrap.id="tieProgress";
    wrap.style.cssText="margin:24px 0;padding:16px 18px;border:1px solid #e6ebf2;border-radius:12px;background:#f7fafc;display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-family:Inter,system-ui,-apple-system,sans-serif";
    var btn=document.createElement('button');
    function paint(){
      btn.textContent=done?'✓ Completed':'Mark this lesson complete';
      btn.style.cssText="border:0;cursor:pointer;font-weight:700;font-size:14px;padding:11px 20px;border-radius:100px;transition:.15s;"+(done?"background:#e8f5ea;color:#2f6b43":"background:linear-gradient(135deg,#20a7e6,#0575ab);color:#fff");
    }
    paint();
    btn.onclick=function(){
      btn.disabled=true;var nd=!done;
      var row={user_id:me.id,doc_key:'lesson:'+lessonId(),fields:{done:nd,title:lessonTitle(),track:lessonTrack()},file_name:null,updated_at:new Date().toISOString()};
      sb.from('progress').upsert(row,{onConflict:'user_id,doc_key'}).then(function(r){
        btn.disabled=false;
        if(!r.error){done=nd;paint();lbl.textContent=done?'Nice. This is now on your dashboard and visible to your coach.':'Ticking this off adds it to your dashboard and your coach can see it.';}
        else{alert('Could not save: '+(r.error.message||'error'));}
      });
    };
    var lbl=document.createElement('div');
    lbl.style.cssText="font-size:13px;color:#5a6b7a;flex:1;min-width:180px";
    lbl.textContent=done?'This is on your dashboard and visible to your coach.':'Ticking this off adds it to your dashboard and your coach can see it.';
    wrap.appendChild(btn);wrap.appendChild(lbl);
    var cta=host.querySelector('.cta');
    if(cta)host.insertBefore(wrap,cta);else host.appendChild(wrap);
  }

  document.addEventListener('DOMContentLoaded',function(){
    loadSb(function(err){
      if(err)return; // network issue: leave the lesson readable, no button
      var sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
      sb.auth.getSession().then(function(res){
        var session=res.data&&res.data.session;
        if(!session){gate(null);return;}
        var me=session.user,email=(me.email||'').toLowerCase();
        var coach=email.endsWith(COACH_DOMAIN);
        var afterAccess=function(ok){
          if(!ok){gate(me.email);return;}
          sb.from('progress').select('fields').eq('user_id',me.id).eq('doc_key','lesson:'+lessonId()).maybeSingle().then(function(r){
            var done=!!(r.data&&r.data.fields&&r.data.fields.done);
            injectButton(sb,me,done);
          });
        };
        if(coach){afterAccess(true);}
        else{sb.from('allowed_members').select('active').eq('email',email).maybeSingle().then(function(r){afterAccess(!!(r.data&&r.data.active));});}
      });
    });
  });
})();
