/* Sherpa — the Vertical Motion AI guide. Floating chat widget for every page.
   Talks to the sherpa-chat edge function (RAG over VM's corpus + the client's
   LDNA/Foundations profile + conversation memory + coaching guardrails).
   Supports uploading a psychometrics / LinkedIn / Foundations file, which Sherpa
   reads and saves to the client's profile. */
(function(){
  if (window.__sherpaLoaded) return; window.__sherpaLoaded = true;
  var SUPABASE_URL="https://rmjlslgfrflbqkwxtidm.supabase.co";
  var SUPABASE_ANON_KEY="sb_publishable_3ooOi3enMiJZpEV6em-Hmw_GmjNmO0f";
  var FN_URL=SUPABASE_URL+"/functions/v1/sherpa-chat";

  function lessonId(){var p=(location.pathname.split('/').pop()||'').replace(/\.html?$/i,'');return p||'index';}
  function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function fmt(s){
    var h=esc(s).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
    var lines=h.split(/\n+/).map(function(l){l=l.trim();if(!l)return '';
      if(/^[-*•]\s+/.test(l))return '<div style="margin:2px 0 2px 4px">• '+l.replace(/^[-*•]\s+/,'')+'</div>';
      return '<p style="margin:0 0 10px">'+l+'</p>';});
    return lines.join('');
  }

  var LOGO='<svg viewBox="0 0 40 40" width="26" height="26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    +'<defs><linearGradient id="shg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#20a7e6"/><stop offset="1" stop-color="#0575ab"/></linearGradient></defs>'
    +'<path d="M8 5h20a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H17l-7 6v-6H8a6 6 0 0 1-6-6V11a6 6 0 0 1 6-6z" fill="url(#shg)"/>'
    +'<path d="M10 25l6.5-11 4 6 3-5 6.5 10z" fill="#fff"/>'
    +'<path d="M20.5 20l3-5 2.2 3.5-2.2.2z" fill="#fc6502"/>'
    +'<path d="M30.5 8.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill="#ffd25a"/>'
    +'</svg>';
  var CLIP='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a6b7a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';

  function el(tag,css,html){var e=document.createElement(tag);if(css)e.style.cssText=css;if(html!=null)e.innerHTML=html;return e;}

  var sb=null, token=SUPABASE_ANON_KEY, greeted=false, busy=false, pendingFile=null;
  function initSb(cb){
    if(window.supabase){ready();return;}
    var s=document.createElement('script');s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    s.onload=ready;s.onerror=function(){cb&&cb();};document.head.appendChild(s);
    function ready(){try{sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
      sb.auth.getSession().then(function(r){var ses=r.data&&r.data.session;if(ses&&ses.access_token)token=ses.access_token;cb&&cb();});
    }catch(e){cb&&cb();}}
  }

  function build(){
    var btn=el('button','position:fixed;right:22px;bottom:22px;z-index:2147483000;width:60px;height:60px;border:0;border-radius:50%;cursor:pointer;background:linear-gradient(135deg,#0693d8,#0575ab);box-shadow:0 10px 28px rgba(6,147,216,.45);display:flex;align-items:center;justify-content:center;transition:transform .15s',LOGO+'<span style="position:absolute;top:-4px;right:-4px;background:#fc6502;color:#fff;font:700 9px Inter,sans-serif;padding:2px 6px;border-radius:100px;font-family:Inter,system-ui,sans-serif">AI</span>');
    btn.setAttribute('aria-label','Ask Sherpa');
    btn.onmouseenter=function(){btn.style.transform='scale(1.06)';};
    btn.onmouseleave=function(){btn.style.transform='scale(1)';};

    var panel=el('div','position:fixed;right:22px;bottom:94px;z-index:2147483000;width:378px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 130px);background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(8,30,43,.34);display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,-apple-system,sans-serif');

    var head=el('div','background:linear-gradient(135deg,#081e2b,#0d3448);color:#fff;padding:15px 16px;display:flex;align-items:center;gap:11px');
    head.innerHTML='<span style="width:40px;height:40px;border-radius:11px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center">'+LOGO+'</span>'
      +'<div style="flex:1"><div style="font-weight:800;font-size:16px;letter-spacing:.2px">Sherpa</div><div style="font-size:11.5px;color:#a9c6d8">Your Vertical Motion guide</div></div>'
      +'<button id="shX" aria-label="Close" style="background:transparent;border:0;color:#cfe0ea;font-size:22px;cursor:pointer;line-height:1;padding:4px">×</button>';

    var body=el('div','flex:1;overflow-y:auto;padding:16px;background:#f5f8fb');

    var chip=el('div','display:none;padding:6px 12px;background:#eaf6fd;border-top:1px solid #d3e9f7;font-size:12px;color:#0575ab;align-items:center;gap:8px');
    var foot=el('div','padding:10px 12px;border-top:1px solid #e6edf2;background:#fff;display:flex;gap:8px;align-items:flex-end');
    var fileInput=el('input');fileInput.type='file';fileInput.accept='.pdf,.png,.jpg,.jpeg,.webp,.txt,.md';fileInput.style.display='none';
    var attach=el('button','border:0;background:transparent;cursor:pointer;padding:8px 4px;display:flex;align-items:center',CLIP);
    attach.title='Attach your assessment or LinkedIn (PDF, image, or text)';
    var ta=el('textarea','flex:1;resize:none;border:1px solid #d7e1ea;border-radius:12px;padding:10px 12px;font:400 14px Inter,system-ui,sans-serif;max-height:96px;outline:none');
    ta.rows=1;ta.placeholder="Ask Sherpa anything…";
    var send=el('button','border:0;cursor:pointer;background:linear-gradient(135deg,#0693d8,#0575ab);color:#fff;font-weight:700;border-radius:12px;padding:10px 16px;font-size:14px','Send');
    foot.appendChild(attach);foot.appendChild(ta);foot.appendChild(send);
    panel.appendChild(head);panel.appendChild(body);panel.appendChild(chip);panel.appendChild(foot);panel.appendChild(fileInput);
    document.body.appendChild(btn);document.body.appendChild(panel);

    function showChip(){ if(pendingFile){ chip.style.display='flex'; chip.innerHTML='📎 <b style="font-weight:600">'+esc(pendingFile.name)+'</b> attached <span id="shClr" style="margin-left:auto;cursor:pointer;color:#0575ab;font-weight:700">Remove</span>'; chip.querySelector('#shClr').onclick=function(){pendingFile=null;chip.style.display='none';}; } else { chip.style.display='none'; } }

    attach.onclick=function(){fileInput.click();};
    fileInput.onchange=function(){
      var f=fileInput.files&&fileInput.files[0]; fileInput.value='';
      if(!f)return;
      if(f.size>10*1024*1024){alert('Please keep files under 10 MB.');return;}
      var rd=new FileReader();
      rd.onload=function(){var res=rd.result||'';var b64=(''+res).split(',')[1]||'';pendingFile={name:f.name,mediaType:f.type||'application/octet-stream',data:b64};showChip();};
      rd.readAsDataURL(f);
    };

    function bubble(role,html,muted){
      var row=el('div','margin:0 0 12px;display:flex;'+(role==='user'?'justify-content:flex-end':'justify-content:flex-start'));
      var b=el('div',(role==='user'
        ?'background:linear-gradient(135deg,#0693d8,#0575ab);color:#fff;'
        :'background:#fff;color:#12303f;border:1px solid #e6edf2;')
        +'max-width:86%;padding:11px 13px;border-radius:14px;font-size:14px;line-height:1.5;'+(muted?'color:#5a6b7a;font-style:italic;':''),html);
      row.appendChild(b);body.appendChild(row);body.scrollTop=body.scrollHeight;return b;
    }
    function greet(){ if(greeted)return; greeted=true;
      bubble('bot',fmt("Hey — I'm **Sherpa**, your Vertical Motion guide. I'm trained on the whole program, Tom's book, two years of Leadership Edge calls, and your own assessments.\n\nAsk me anything — or tap the clip to share your Foundations Report, LDNA, or LinkedIn so I can coach you personally.")); }

    function open(){panel.style.display='flex';btn.style.display='none';greet();setTimeout(function(){ta.focus();},50);}
    function close(){panel.style.display='none';btn.style.display='flex';}
    btn.onclick=open; head.querySelector('#shX').onclick=close;

    ta.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask();}});
    ta.addEventListener('input',function(){ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,96)+'px';});
    send.onclick=ask;

    function ask(){
      var q=ta.value.trim(); var f=pendingFile;
      if((!q && !f)||busy)return; busy=true;
      ta.value='';ta.style.height='auto';
      if(f){ bubble('user','📎 '+esc(f.name)+(q?'<br>'+esc(q):'')); pendingFile=null; showChip(); }
      else { bubble('user',esc(q)); }
      var thinking=bubble('bot','<span>Sherpa is '+(f?'reading your file…':'thinking…')+'</span>',true);
      var payload={question:q,lesson:lessonId()}; if(f)payload.file=f;
      fetch(FN_URL,{method:'POST',headers:{'Authorization':'Bearer '+token,'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)})
        .then(function(r){return r.json();})
        .then(function(d){
          thinking.parentNode.remove();
          if(d && d.answer){
            var b=bubble('bot',fmt(d.answer));
            if(d.sources&&d.sources.length){
              var seen={},labels=[];
              d.sources.forEach(function(s){var k=(s.source||'')+':'+(s.title||'');if(!seen[k]){seen[k]=1;labels.push(s.title||s.source);}});
              if(labels.length){var sc=el('div','margin-top:8px;padding-top:8px;border-top:1px solid #eef2f6;font-size:11px;color:#8496a5','Drawn from: '+labels.slice(0,4).map(esc).join(' · '));b.appendChild(sc);}
            }
          } else { bubble('bot','I hit a snag with that. Try again in a moment, or reach out to your VM coach.',true); }
          busy=false;
        })
        .catch(function(){thinking.parentNode.remove();bubble('bot','I could not reach the guide just now. Please try again shortly.',true);busy=false;});
    }
  }

  document.addEventListener('DOMContentLoaded',function(){ initSb(function(){}); build(); });
})();
