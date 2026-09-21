"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface JobFile { name: string; sizeBytes: number; kind: string }
interface HistoryItem { id: string; ask: string; status: string; kind: string; createdAt: number; itemsDone: number; itemsTotal: number; files: number; totalBytes: number; }
interface Job { id: string; status: string; ask: string; plan: string; kind: string; progress: number; stage: string; itemsDone: number; itemsTotal: number; files: JobFile[]; preview: any[]; error?: string; logs: string[]; }

const EXAMPLES = [
  { q: "hr mails for google, 20", k: "hr", icon: "✉", c: "bg-[#FF3B30] text-white" },
  { q: "google interview questions, 50", k: "interview", icon: "✦", c: "bg-[#0F0F0F] text-[#FFC01F]" },
  { q: "20 papers on diffusion models with pdfs", k: "papers", icon: "◈", c: "bg-[#0F0F0F] text-white" },
  { q: "200000 rows movie reviews dataset", k: "dataset", icon: "▦", c: "bg-[#FFC01F] text-[#0F0F0F]" },
  { q: "github repos for llm agents, 15", k: "github", icon: "⬢", c: "bg-white text-[#0F0F0F]" },
  { q: "30 images of neural network art", k: "images", icon: "◫", c: "bg-[#FF3B30] text-white" },
  { q: "scrape https://en.wikipedia.org/wiki/Web_scraping", k: "web", icon: "↗", c: "bg-[#0B1E3C] text-white" },
  { q: "TCS NQT previous year question papers", k: "edu", icon: "◎", c: "bg-white text-[#0F0F0F]" },
];

function fmtSize(n: number){ if(n>1e9) return (n/1e9).toFixed(1)+" GB"; if(n>1e6) return (n/1e6).toFixed(1)+" MB"; if(n>1e3) return (n/1e3).toFixed(1)+" KB"; return n+" B"; }
function timeAgo(ts:number){
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60) return "now";
  if(s<3600) return Math.floor(s/60)+"m ago";
  if(s<86400) return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
}
function kindMeta(k:string){
  const map:Record<string,{label:string, bg:string, dot:string}> = {
    papers:{label:"PAPERS", bg:"bg-[#0F0F0F] text-white", dot:"bg-[#FF3B30]"},
    dataset:{label:"DATASET", bg:"bg-[#FFC01F] text-[#0F0F0F]", dot:"bg-[#0B1E3C]"},
    github:{label:"GITHUB", bg:"bg-white text-[#0F0F0F] border", dot:"bg-[#0F0F0F]"},
    images:{label:"IMAGES", bg:"bg-[#FF3B30] text-white", dot:"bg-white"},
    web:{label:"WEB", bg:"bg-[#0B1E3C] text-white", dot:"bg-[#FFC01F]"},
    edu:{label:"EDU", bg:"bg-[#F5EFE6] text-[#0F0F0F]", dot:"bg-[#FF6B1A]"},
    jobs:{label:"JOBS", bg:"bg-[#0B1E3C] text-[#FFC01F]", dot:"bg-[#FFC01F]"},
    hr:{label:"HR", bg:"bg-[#FF3B30] text-white", dot:"bg-white"},
    interview:{label:"INTERVIEW", bg:"bg-[#0F0F0F] text-[#FFC01F]", dot:"bg-[#FFC01F]"},
    universal:{label:"UNIVERSAL", bg:"bg-[#FFC01F] text-[#0F0F0F]", dot:"bg-[#FF3B30]"},
    models:{label:"MODELS", bg:"bg-white text-[#0F0F0F]", dot:"bg-[#FF3B30]"},
    generic:{label:"GENERIC", bg:"bg-[#EDE8E0] text-[#0F0F0F]", dot:"bg-[#0F0F0F]"},
    data_index:{label:"DATA", bg:"bg-[#0B1E3C] text-white", dot:"bg-white"},
  };
  return map[k]||{label:k.toUpperCase(), bg:"bg-white text-[#0F0F0F] border", dot:"bg-[#0F0F0F]"};
}

export default function Home(){
  const [ask,setAsk]=useState("");
  const [jobId,setJobId]=useState<string|null>(null);
  const [job,setJob]=useState<Job|null>(null);
  const [busy,setBusy]=useState(false);
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [filter,setFilter]=useState<string>("all");
  const [search,setSearch]=useState("");
  const [previewTab,setPreviewTab]=useState<"table"|"json"|"md"|"raw">("table");
  const [logFilter,setLogFilter]=useState<"all"|"error"|"ok">("all");
  const [mobileNav,setMobileNav]=useState(false);
  const [queue,setQueue]=useState<string[]>([]);
  const [showCmd,setShowCmd]=useState(false);
  const [autoScroll,setAutoScroll]=useState(true);
  const pollRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const logRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLInputElement>(null);

  // live time
  const [live,setLive]=useState("");
  useEffect(()=>{ const i=setInterval(()=> setLive(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})),1000); setLive(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})); return()=>clearInterval(i)},[]);

  const loadHistory=useCallback(async()=>{
    try{ const r=await fetch("/api/ask/history",{cache:"no-store"}); if(r.ok) setHistory(await r.json()); }catch{}
  },[]);
  useEffect(()=>{ loadHistory(); const i=setInterval(loadHistory,8000); return()=>clearInterval(i)},[loadHistory]);

  const poll=useCallback((id:string)=>{
    if(pollRef.current) clearInterval(pollRef.current);
    pollRef.current=setInterval(async()=>{
      try{
        const r=await fetch(`/api/ask/status?id=${id}`,{cache:"no-store"});
        if(!r.ok) throw new Error("gone");
        const j:Job=await r.json();
        setJob(j);
        if(j.status==="done"||j.status==="error"){
          if(pollRef.current) clearInterval(pollRef.current);
          setBusy(false);
          loadHistory();
          // queue next
          setQueue(q=>{ if(q.length){ const [n,...rest]=q; setTimeout(()=> go(n), 600); return rest;} return q; });
        }
      }catch{ if(pollRef.current) clearInterval(pollRef.current); setBusy(false); }
    },800);
  },[loadHistory]);

  const go=async(text?:string)=>{
    const q=(text??ask).trim();
    if(!q || busy) return;
    // if busy and queue enabled, queue it
    if(busy){
      setQueue(prev=>[...prev,q]);
      return;
    }
    setBusy(true); setJob(null); setJobId(null); setPreviewTab("table");
    try{
      const r=await fetch("/api/ask/run",{method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ask:q})});
      const j=await r.json();
      if(j.error){ setBusy(false); return; }
      setJobId(j.jobId);
      setJob({id:j.jobId, status:"queued", ask:q, plan:j.plan, kind:j.intent.kind, progress:0, stage:"queued", itemsDone:0, itemsTotal:0, files:[], preview:[], logs:[]});
      poll(j.jobId);
      document.getElementById("job")?.scrollIntoView({behavior:"smooth", block:"start"});
    }catch{ setBusy(false); }
  };

  const reopen=async(id:string)=>{
    try{
      const r=await fetch(`/api/ask/status?id=${id}`,{cache:"no-store"});
      if(!r.ok) return;
      const j:Job=await r.json();
      setJob(j); setAsk(j.ask); setJobId(j.id);
      if(["queued","running"].includes(j.status)) { setBusy(true); poll(j.id); }
      document.getElementById("job")?.scrollIntoView({behavior:"smooth"});
    }catch{}
  };

  const retry=()=>{
    if(!job) return;
    go(job.ask);
  };

  useEffect(()=>()=>{ if(pollRef.current) clearInterval(pollRef.current)},[]);

  // auto scroll logs
  useEffect(()=>{ if(autoScroll && logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[job?.logs, autoScroll]);

  // cmd+k
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey)&& e.key.toLowerCase()==="k"){ e.preventDefault(); inputRef.current?.focus(); setShowCmd(v=>!v); }
      if((e.metaKey||e.ctrlKey)&& e.key==="Enter"){ e.preventDefault(); go(); }
      if(e.key==="Escape"){ setShowCmd(false); setMobileNav(false); }
    };
    window.addEventListener("keydown",h); return()=> window.removeEventListener("keydown",h);
  },[ask,busy]);

  const running= busy || (job && ["queued","running"].includes(job.status));
  const pct= job? Math.round(job.progress):0;
  const done= job?.status==="done";

  // derived
  const filteredHistory= useMemo(()=>{
    let h=[...history];
    if(filter!=="all") h=h.filter(x=> x.kind===filter);
    if(search.trim()){
      const s=search.toLowerCase();
      h=h.filter(x=> x.ask.toLowerCase().includes(s) || x.kind.includes(s) || x.status.includes(s));
    }
    return h;
  },[history,filter,search]);

  const metrics= useMemo(()=>{
    const total=history.length;
    const ok=history.filter(h=>h.status==="done").length;
    const files=history.reduce((a,b)=>a+b.files,0);
    const bytes=history.reduce((a,b)=>a+b.totalBytes,0);
    const rate= total? Math.round(ok/total*100):0;
    return {total, ok, files, bytes, rate};
  },[history]);

  const filteredLogs= useMemo(()=>{
    if(!job) return [];
    if(logFilter==="all") return job.logs;
    if(logFilter==="error") return job.logs.filter(l=> /error|failed|fail/i.test(l));
    return job.logs.filter(l=> /done|saved|found|complete|ok/i.test(l));
  },[job,logFilter]);

  // reveal
  useEffect(()=>{
    const obs=new IntersectionObserver(es=> es.forEach(e=> e.isIntersecting && e.target.classList.add("in")),{threshold:0.12});
    document.querySelectorAll(".reveal").forEach(el=> obs.observe(el));
    return()=> obs.disconnect();
  },[job, filteredHistory.length]);

  return (
    <div className="min-h-screen flex">
      {/* SIDEBAR */}
      <aside className={`hidden lg:flex w-[64px] xl:w-[220px] shrink-0 border-r-[1.5px] border-[#0F0F0F] bg-white flex-col sticky top-0 h-[100dvh] z-30`}>
        <div className="h-[64px] border-b-[1.5px] border-[#0F0F0F] flex items-center gap-3 px-3">
          <div className="w-9 h-9 bg-[#0F0F0F] text-[#FFC01F] grid place-items-center border border-[#0F0F0F] shadow-[3px_3px_0_#FF3B30] rotate-[-3deg] font-mono font-black">◈</div>
          <div className="hidden xl:block leading-none">
            <div className="font-black tracking-[-0.04em] text-[15px]">INSTANT</div>
            <div className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-60 -mt-0.5">Scraper • v2</div>
          </div>
        </div>
        <nav className="flex-1 py-4 px-2 flex flex-col gap-1.5">
          {[
            {icon:"⬢", label:"Studio", active:true, href:"#studio"},
            {icon:"◈", label:"History", sub:String(history.length), href:"#history"},
            {icon:"▦", label:"Analytics", href:"#analytics"},
            {icon:"⚙", label:"Settings", href:"#"},
          ].map(i=>(
            <a key={i.label} href={i.href} className={`flex items-center gap-3 px-2.5 py-2.5 border-[1.5px] font-bold text-[13px] transition ${i.active? "bg-[#0F0F0F] text-white border-[#0F0F0F] shadow-[3px_3px_0_#FF3B30]":"bg-white border-transparent hover:border-[#0F0F0F] hover:shadow-[2px_2px_0_#0F0F0F]"}`}>
              <span className={`w-7 h-7 grid place-items-center border text-[12px] shrink-0 ${i.active?"bg-[#FFC01F] text-[#0F0F0F] border-white":"bg-[#F5EFE6] border-[#0F0F0F]"}`}>{i.icon}</span>
              <span className="hidden xl:block">{i.label}</span>
              {i.sub && <span className="hidden xl:inline ml-auto bg-[#FFC01F] text-[#0F0F0F] border border-[#0F0F0F] px-1.5 py-0.5 font-mono text-[10px]">{i.sub}</span>}
            </a>
          ))}
          <div className="hidden xl:block mt-4 mx-2 p-3 bg-[#FFC01F] border-[1.5px] border-[#0F0F0F] shadow-[3px_3px_0_#0F0F0F]">
            <div className="font-mono text-[10px] tracking-[0.1em] uppercase font-black">Pro tip</div>
            <div className="text-[12px] leading-[1.5] mt-1 font-medium">Press <b className="bg-[#0F0F0F] text-white px-1">⌘K</b> to jump to ask, <b className="bg-[#0F0F0F] text-white px-1">⌘↩</b> to run.</div>
          </div>
        </nav>
        <div className="p-2 border-t-[1.5px] border-[#0F0F0F] hidden xl:flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#0B1E3C] border border-[#0F0F0F] grid place-items-center text-white text-[11px]">A</div>
          <div className="leading-none">
            <div className="text-[12px] font-bold">Antriksh</div>
            <div className="font-mono text-[10px] opacity-60">{live} • IST</div>
          </div>
          <span className="ml-auto w-2 h-2 bg-emerald-500 border border-[#0F0F0F] rounded-full animate-[pulseDot_1s_infinite]" />
        </div>
      </aside>

      {/* MOBILE NAV */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#FFFCF7]/90 backdrop-blur-xl border-b-[1.5px] border-[#0F0F0F] flex items-center justify-between px-4 h-[56px]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0F0F0F] text-[#FFC01F] grid place-items-center border border-[#0F0F0F] font-mono font-black text-[14px]">◈</div>
          <span className="font-black tracking-[-0.03em]">INSTANT</span>
          <span className="font-mono text-[10px] bg-[#FFC01F] border border-[#0F0F0F] px-1.5 py-0.5 font-bold">v2</span>
        </div>
        <button onClick={()=> setMobileNav(!mobileNav)} className="w-9 h-9 border-[1.5px] border-[#0F0F0F] bg-white grid place-items-center shadow-[2px_2px_0_#0F0F0F]">{mobileNav?"✕":"☰"}</button>
        {mobileNav && (
          <div className="absolute top-[56px] left-0 right-0 bg-white border-b-[1.5px] border-[#0F0F0F] p-3 flex flex-col gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
            <a href="#studio" onClick={()=> setMobileNav(false)} className="bg-[#0F0F0F] text-white border border-[#0F0F0F] px-3 py-2.5 font-bold text-[13px]">⬢ Studio</a>
            <a href="#history" onClick={()=> setMobileNav(false)} className="bg-white border border-[#0F0F0F] px-3 py-2.5 font-bold text-[13px]">◈ History ({history.length})</a>
            <a href="#analytics" onClick={()=> setMobileNav(false)} className="bg-white border border-[#0F0F0F] px-3 py-2.5 font-bold text-[13px]">▦ Analytics</a>
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="flex-1 min-w-0">
        {/* TOPBAR - DESKTOP ONLY */}
        <div className="hidden lg:flex sticky top-0 z-20 bg-[#FFFCF7]/85 backdrop-blur-xl border-b-[1.5px] border-[#0F0F0F] h-[64px] items-center gap-3 px-4 xl:px-6">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
            <span className="w-2 h-2 bg-emerald-500 border border-[#0F0F0F] rounded-full animate-[pulseDot_1s_infinite]" /> FILE-BACKED • KEYLESS • SURVIVES RELOAD
          </div>
          <div className="ml-auto hidden xl:flex items-center gap-2 font-mono text-[11px]">
            <span className="opacity-60">Queue</span>
            <span className="bg-white border border-[#0F0F0F] px-2 py-1 font-bold shadow-[2px_2px_0_#0F0F0F]">{queue.length} pending</span>
            <span className="opacity-30">|</span>
            <span className="opacity-60">{live}</span>
          </div>
          <button onClick={()=> setShowCmd(true)} className="hidden xl:flex items-center gap-2 bg-white border border-[#0F0F0F] px-3 py-1.5 font-mono text-[11px] font-bold shadow-[2px_2px_0_#0F0F0F] hover:translate-y-[-1px] transition">
            <span>⌘K</span> <span className="opacity-40">Jump to ask</span>
          </button>
        </div>

        {/* HERO */}
        <section className="relative overflow-hidden border-b-[1.5px] border-[#0F0F0F] pt-[56px] lg:pt-0">
          {/* grid bg */}
          <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage:"linear-gradient(#0F0F0F 1px, transparent 1px), linear-gradient(90deg, #0F0F0F 1px, transparent 1px)", backgroundSize:"32px 32px"}} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FFFCF7]/80" />
          <div className="relative max-w-[1280px] mx-auto px-4 md:px-6 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#0F0F0F] text-white border border-[#0F0F0F] px-2.5 py-1 font-mono text-[11px] tracking-[0.12em] uppercase font-bold">
                <span className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full animate-[pulseDot_1s_infinite]" /> Instant • Universal • Zero config
              </div>
              <h1 className="mt-3 font-black leading-[0.88] tracking-[-0.045em]" style={{fontFamily:"var(--font-geist-sans)", fontSize:"clamp(36px,6vw,64px)"}}>
                <span className="block overflow-hidden"><span className="block animate-[slideUp_0.7s_ease_both]">Ask for</span></span>
                <span className="block overflow-hidden"><span className="block animate-[slideUp_0.7s_0.08s_ease_both] text-[#FF3B30]">anything.</span></span>
                <span className="block overflow-hidden"><span className="block animate-[slideUp_0.7s_0.16s_ease_both]">Get the files.</span></span>
              </h1>
              <p className="mt-3 text-[15px] md:text-[16px] leading-[1.6] text-[#333] max-w-[560px]">
                One box for <b>papers as PDFs, 100k+ row datasets, GitHub repos, images, any webpage</b>. Heuristic intent + optional LLM — no keys required.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="bg-white border-[1.5px] border-[#0F0F0F] px-2.5 py-1.5 font-mono text-[11px] font-bold shadow-[2px_2px_0_#0F0F0F]">⚡ 5 sources parallel</span>
                <span className="bg-[#FFC01F] border-[1.5px] border-[#0F0F0F] px-2.5 py-1.5 font-mono text-[11px] font-bold shadow-[2px_2px_0_#0F0F0F]">◈ %PDF validated</span>
                <span className="bg-white border-[1.5px] border-[#0F0F0F] px-2.5 py-1.5 font-mono text-[11px] font-bold shadow-[2px_2px_0_#0F0F0F]">↗ ZIP one-click</span>
              </div>
            </div>

            {/* PIPELINE VISUAL */}
            <div className="relative h-[320px] md:h-[360px] bg-white border-[1.5px] border-[#0F0F0F] shadow-[8px_8px_0_#0F0F0F] overflow-hidden p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] tracking-[0.1em] uppercase font-black flex items-center gap-2"><span className="w-2 h-2 bg-[#FF3B30] border border-[#0F0F0F] rounded-full animate-[pulseDot_1s_infinite]" /> Live pipeline</div>
                <div className="font-mono text-[10px] bg-[#0F0F0F] text-white px-2 py-1">4 stages • streaming</div>
              </div>

              {/* pipeline */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  {s:"ASK", d:"natural text", col:"bg-[#0F0F0F] text-white"},
                  {s:"CLASSIFY", d:"heuristic + LLM", col:"bg-[#FFC01F] text-[#0F0F0F]"},
                  {s:"FETCH", d:"5 APIs parallel", col:"bg-white text-[#0F0F0F] border"},
                  {s:"FILES", d:"CSV • PDF • ZIP", col:"bg-[#FF3B30] text-white"},
                ].map((x,i)=>(
                  <div key={x.s} className={`border-[1.5px] border-[#0F0F0F] p-2.5 text-center relative overflow-hidden ${x.col}`}>
                    <div className="font-black text-[11px] tracking-[0.08em]">{x.s}</div>
                    <div className="font-mono text-[10px] opacity-70 leading-tight">{x.d}</div>
                    {i<3 && <div className="hidden md:block absolute -right-[7px] top-1/2 -translate-y-1/2 w-[13px] h-[13px] bg-inherit border-r-[1.5px] border-t-[1.5px] border-[#0F0F0F] rotate-45 z-10" />}
                  </div>
                ))}
              </div>

              {/* animated track */}
              <div className="mt-4 h-[6px] bg-[#F5EFE6] border border-[#0F0F0F] overflow-hidden relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="h-[2px] w-full bg-[#0F0F0F]/10" />
                  <div className="absolute h-full w-[28%] bg-[#FF3B30] animate-[pipeline_1.6s_linear_infinite]" style={{left:"-28%"}} />
                </div>
              </div>

              {/* metrics bento */}
              <div className="mt-4 grid grid-cols-3 gap-2 flex-1">
                <div className="bg-[#0B1E3C] text-white border-[1.5px] border-[#0F0F0F] p-3 flex flex-col justify-between">
                  <div className="font-mono text-[10px] tracking-[0.08em] uppercase opacity-70">Papers</div>
                  <div className="font-black text-[22px] leading-none">5 APIs</div>
                  <div className="font-mono text-[10px] opacity-60">arXiv • OpenAlex • Crossref</div>
                  <div className="mt-2 flex gap-1">
                    {[...Array(6)].map((_,i)=><div key={i} className="flex-1 h-[3px] bg-white/20"><div className="h-full bg-[#FFC01F]" style={{width: 30+Math.random()*70+"%"}} /></div>)}
                  </div>
                </div>
                <div className="bg-[#FFC01F] border-[1.5px] border-[#0F0F0F] p-3 flex flex-col justify-between">
                  <div className="font-mono text-[10px] tracking-[0.08em] uppercase font-black">Dataset</div>
                  <div className="font-black text-[22px] leading-none">500k</div>
                  <div className="font-mono text-[10px]">rows max • parquet</div>
                  <div className="mt-2 h-[4px] bg-[#0F0F0F]/10 border border-[#0F0F0F]/20"><div className="h-full bg-[#0F0F0F] w-[68%]" /></div>
                </div>
                <div className="bg-white border-[1.5px] border-[#0F0F0F] p-3 flex flex-col justify-between">
                  <div className="font-mono text-[10px] tracking-[0.08em] uppercase font-black">Jobs</div>
                  <div className="font-black text-[22px] leading-none">{metrics.total}</div>
                  <div className="font-mono text-[10px] opacity-60">{metrics.rate}% success</div>
                  <div className="mt-2 flex gap-1">
                    {[...Array(4)].map((_,i)=><div key={i} className="w-1 bg-[#FF3B30] border border-[#0F0F0F] animate-[wave_0.8s_ease-in-out_infinite]" style={{height: 10+Math.random()*14+"px", animationDelay:i*0.08+"s"}} />)}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 font-mono text-[10px]">
                <span className="bg-[#0F0F0F] text-white px-2 py-1 border border-[#0F0F0F]">● {metrics.files} files</span>
                <span className="bg-white border border-[#0F0F0F] px-2 py-1">{fmtSize(metrics.bytes)} total</span>
                <span className="ml-auto opacity-50">file-backed • survives reload</span>
              </div>
            </div>
          </div>
        </section>

        {/* STUDIO */}
        <section id="studio" className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* ask */}
          <div className="bg-white border-[1.5px] border-[#0F0F0F] shadow-[8px_8px_0_#0F0F0F] overflow-hidden reveal">
            <div className="bg-[#0F0F0F] text-white px-3 md:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#FF3B30] rounded-full animate-[pulseDot_1s_infinite] border border-white" />
                <span className="font-mono text-[11px] tracking-[0.12em] uppercase font-black">Ask Studio</span>
                <span className="hidden md:inline font-mono text-[11px] opacity-60">• natural language • zero config</span>
                {queue.length>0 && <span className="bg-[#FFC01F] text-[#0F0F0F] border border-white px-2 py-0.5 font-mono text-[11px] font-black">Queue: {queue.length}</span>}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="hidden md:inline opacity-60">⌘K to focus • ⌘↩ to run</span>
                <span className={`px-2 py-1 border font-bold ${running? "bg-[#FF3B30] text-white border-white animate-pulse":"bg-white text-[#0F0F0F] border-[#0F0F0F]"}`}>{running? "WORKING…":"READY"}</span>
              </div>
            </div>

            <div className="p-3 md:p-4">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="flex-1 flex items-center gap-2 bg-[#FFFCF7] border-[1.5px] border-[#0F0F0F] shadow-[4px_4px_0_#0F0F0F] p-1.5 focus-within:shadow-[6px_6px_0_#0F0F0F] focus-within:-translate-y-[1px] transition">
                  <div className="w-9 h-9 bg-[#0F0F0F] text-white grid place-items-center border border-[#0F0F0F] shrink-0">↗</div>
                  <input
                    ref={inputRef}
                    value={ask} onChange={e=> setAsk(e.target.value)}
                    onKeyDown={e=> e.key==="Enter" && go()}
                    placeholder='e.g. "25 papers on vision transformers with pdfs"  •  "50000 rows amazon reviews"  •  "scrape https://..."'
                    className="flex-1 bg-transparent outline-none px-2 py-2 text-[14px] md:text-[15px] font-medium placeholder:text-zinc-400 min-w-0"
                    disabled={!!running}
                  />
                  <button onClick={()=> setAsk("")} className="hidden md:grid w-9 h-9 place-items-center border border-[#0F0F0F] bg-white hover:bg-[#0F0F0F] hover:text-white transition shrink-0">✕</button>
                </div>
                <button onClick={()=> go()} disabled={!!running || !ask.trim()}
                  className="bg-[#FF3B30] text-white border-[1.5px] border-[#0F0F0F] px-6 py-3 font-black text-[13px] tracking-[0.06em] uppercase shadow-[4px_4px_0_#0F0F0F] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0_#0F0F0F] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 shrink-0">
                  {running? <><span className="w-2 h-2 bg-white rounded-full animate-[pulseDot_0.7s_infinite]" /> Working… {pct}%</> : <>Get it →</>}
                </button>
              </div>

              {/* bento examples */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
                {EXAMPLES.map(ex=>(
                  <button key={ex.q} onClick={()=> { setAsk(ex.q); go(ex.q); }} disabled={!!running}
                    className={`text-left border-[1.5px] border-[#0F0F0F] p-3 flex gap-3 items-start hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#0F0F0F] transition disabled:opacity-40 group ${ex.c} shadow-[3px_3px_0_#0F0F0F]`}>
                    <span className={`w-8 h-8 grid place-items-center border border-[#0F0F0F] bg-white text-[#0F0F0F] shrink-0 font-black group-hover:rotate-[-6deg] transition`}>{ex.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-bold leading-[1.3] line-clamp-2">{ex.q}</span>
                      <span className="inline-flex mt-1.5 font-mono text-[10px] tracking-[0.08em] uppercase bg-white/90 text-[#0F0F0F] border border-[#0F0F0F] px-1.5 py-0.5 font-black">{ex.k}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* analytics bento */}
          <div id="analytics" className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 reveal">
            {[
              {label:"Total jobs", v:String(metrics.total), sub:`${metrics.ok} done`, bg:"bg-white"},
              {label:"Success rate", v:metrics.rate+"%", sub:"file-backed", bg:"bg-[#0F0F0F] text-white"},
              {label:"Files created", v:String(metrics.files), sub:fmtSize(metrics.bytes), bg:"bg-[#FFC01F]"},
              {label:"Queue", v:String(queue.length), sub: running? "processing":"idle", bg:"bg-white"},
            ].map(c=>(
              <div key={c.label} className={`border-[1.5px] border-[#0F0F0F] p-3 md:p-4 shadow-[4px_4px_0_#0F0F0F] ${c.bg}`}>
                <div className="font-mono text-[10px] tracking-[0.1em] uppercase font-black opacity-70">{c.label}</div>
                <div className="font-black text-[26px] leading-none mt-1">{c.v}</div>
                <div className="font-mono text-[11px] opacity-60 mt-1">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* JOB */}
          <div id="job" className="mt-6">
            {!job && (
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3 reveal">
                <div className="bg-white border-[1.5px] border-[#0F0F0F] shadow-[6px_6px_0_#0F0F0F] p-5 md:p-6">
                  <div className="w-12 h-12 bg-[#FFC01F] border-[1.5px] border-[#0F0F0F] grid place-items-center text-[22px] rotate-[-2deg] shadow-[3px_3px_0_#0F0F0F]">◈</div>
                  <h3 className="mt-3 font-black text-[22px] tracking-[-0.02em]">Ready to scrape</h3>
                  <p className="text-[14px] leading-[1.6] text-zinc-600 mt-1.5">Paste a URL or describe the dataset. The heuristic classifier picks the right pipeline and streams files — PDFs are validated, parquet pulled direct.</p>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="bg-[#F5EFE6] border border-[#0F0F0F] p-2.5"><b>papers</b> → arXiv + OpenAlex + Crossref + Semantic Scholar → PDFs + BibTeX</div>
                    <div className="bg-[#F5EFE6] border border-[#0F0F0F] p-2.5"><b>dataset</b> → Hugging Face ranked → CSV/JSONL or parquet</div>
                    <div className="bg-[#F5EFE6] border border-[#0F0F0F] p-2.5"><b>github</b> → search → CSV + READMEs</div>
                    <div className="bg-[#F5EFE6] border border-[#0F0F0F] p-2.5"><b>web / images / jobs</b> → DuckDuckGo / Openverse / JobSpy</div>
                  </div>
                </div>
                <div className="bg-[#0B1E3C] text-white border-[1.5px] border-[#0F0F0F] shadow-[6px_6px_0_#0F0F0F] p-5 md:p-6 flex flex-col">
                  <div className="font-mono text-[11px] tracking-[0.1em] uppercase font-black opacity-70">How it works</div>
                  <h4 className="font-black text-[18px] leading-tight mt-2">File-backed jobs survive reloads.</h4>
                  <div className="mt-4 space-y-2.5 font-mono text-[12px] leading-relaxed">
                    <div className="flex gap-2"><span className="w-6 h-6 bg-[#FFC01F] text-[#0F0F0F] grid place-items-center border border-white font-black shrink-0">1</span><span><b>POST /api/ask/run</b> — classify + start</span></div>
                    <div className="flex gap-2"><span className="w-6 h-6 bg-white text-[#0F0F0F] grid place-items-center border border-[#0F0F0F] font-black shrink-0">2</span><span><b>GET /api/ask/status</b> — poll progress/logs/preview</span></div>
                    <div className="flex gap-2"><span className="w-6 h-6 bg-[#FF3B30] text-white grid place-items-center border border-white font-black shrink-0">3</span><span><b>ZIP</b> or single file download</span></div>
                  </div>
                  <div className="mt-auto pt-4 flex gap-2">
                    <a href="https://github.com/AntrikshH90/instant-scraper-work" target="_blank" className="flex-1 bg-white text-[#0F0F0F] border border-[#0F0F0F] py-2.5 text-center font-black text-[12px] tracking-[0.06em] uppercase">GitHub →</a>
                    <button onClick={()=> inputRef.current?.focus()} className="flex-1 bg-[#FF3B30] text-white border border-white py-2.5 font-black text-[12px] tracking-[0.06em] uppercase">Try ask</button>
                  </div>
                </div>
              </div>
            )}

            {job && (
              <div className="bg-white border-[1.5px] border-[#0F0F0F] shadow-[8px_8px_0_#0F0F0F] overflow-hidden reveal">
                {/* job header */}
                <div className="bg-[#F5EFE6] border-b-[1.5px] border-[#0F0F0F] px-3 md:px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border-[1.5px] border-[#0F0F0F] font-mono text-[11px] font-black tracking-[0.08em] uppercase ${kindMeta(job.kind).bg}`}>
                        <span className={`w-2 h-2 rounded-full border border-[#0F0F0F] ${kindMeta(job.kind).dot} ${running? "animate-[pulseDot_0.8s_infinite]":""}`} /> {job.kind} • {job.status}
                      </span>
                      <span className="font-mono text-[11px] bg-white border border-[#0F0F0F] px-2 py-1">{pct}%</span>
                      <span className="font-mono text-[11px] hidden md:inline opacity-60 truncate max-w-[320px]">{job.id}</span>
                      <span className={`font-mono text-[11px] px-2 py-1 border font-bold hidden md:inline ${done? "bg-[#FFC01F] border-[#0F0F0F]":"bg-white border-[#0F0F0F]"}`}>{job.stage}</span>
                    </div>
                    <div className="mt-1.5 text-[13px] leading-[1.5] text-[#222] line-clamp-2">{job.plan}</div>
                    <div className="font-mono text-[11px] text-[#8A817C] truncate">“{job.ask}”</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right hidden md:block">
                      <div className="font-black text-[32px] leading-none tracking-[-0.03em]">{pct}<span className="text-[#FF3B30]">%</span></div>
                      <div className="font-mono text-[10px] tracking-[0.08em] uppercase font-bold opacity-60 -mt-1">{job.itemsDone.toLocaleString()}/{job.itemsTotal? job.itemsTotal.toLocaleString():"—"}</div>
                    </div>
                    <button onClick={retry} disabled={!!running} className="bg-white border-[1.5px] border-[#0F0F0F] px-3 py-2 font-bold text-[11px] tracking-[0.06em] uppercase shadow-[2px_2px_0_#0F0F0F] hover:shadow-[3px_3px_0_#0F0F0F] hover:-translate-y-[1px] transition disabled:opacity-40">↻ Retry</button>
                    <button onClick={()=> { if(job) { navigator.clipboard.writeText(job.ask); } }} className="bg-[#0F0F0F] text-white border-[1.5px] border-[#0F0F0F] px-3 py-2 font-bold text-[11px] tracking-[0.06em] uppercase shadow-[2px_2px_0_#0F0F0F]">⎘ Copy</button>
                  </div>
                </div>

                {/* progress */}
                <div className="h-[10px] bg-[#F5EFE6] border-b-[1.5px] border-[#0F0F0F] relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-[#FF3B30] transition-all duration-700 ease-out" style={{width: `${done?100:pct}%`}}>
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.2s_infinite]" style={{background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)"}} />
                  </div>
                  <div className="absolute inset-0 opacity-[0.06]" style={{background:"repeating-linear-gradient(90deg, #0F0F0F 0 2px, transparent 2px 10px)"}} />
                </div>

                {/* body */}
                <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-0">
                  {/* left: logs + preview */}
                  <div className="p-3 md:p-4 border-b xl:border-b-0 xl:border-r-[1.5px] border-[#0F0F0F] bg-white flex flex-col gap-4 min-w-0">
                    {/* preview tabs */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1.5">
                          {[
                            {id:"table", label:"▦ Table"},
                            {id:"json", label:"{} JSON"},
                            {id:"md", label:"≡ MD"},
                            {id:"raw", label:"◈ Raw"},
                          ].map(t=>(
                            <button key={t.id} onClick={()=> setPreviewTab(t.id as any)} className={`px-2.5 py-1.5 border-[1.5px] font-mono text-[11px] font-black tracking-[0.06em] uppercase transition ${previewTab===t.id? "bg-[#0F0F0F] text-white border-[#0F0F0F] shadow-[2px_2px_0_#FF3B30]":"bg-white border-[#0F0F0F] hover:bg-[#F5EFE6]"}`}>{t.label}</button>
                          ))}
                        </div>
                        <span className="font-mono text-[11px] bg-[#FFC01F] border border-[#0F0F0F] px-2 py-1 font-bold">{job.preview.length} items</span>
                      </div>

                      <div className="mt-3 border-[1.5px] border-[#0F0F0F] bg-[#FFFCF7] min-h-[220px] max-h-[320px] overflow-auto">
                        {job.preview.length===0 ? (
                          <div className="h-[220px] grid place-items-center p-6 text-center">
                            <div>
                              <div className="w-10 h-10 mx-auto border border-[#0F0F0F] bg-white grid place-items-center animate-[float_2s_ease-in-out_infinite]">◈</div>
                              <div className="font-mono text-[11px] font-black tracking-[0.08em] uppercase mt-3 opacity-60">{running? "Collecting preview…":"No preview yet"}</div>
                              <div className="text-[12px] text-zinc-500 mt-1 max-w-[320px]">{running? "First rows appear as soon as fetch starts":"Preview shows first 5 rows/files"}</div>
                            </div>
                          </div>
                        ) : previewTab==="json" ? (
                          <pre className="p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">{JSON.stringify(job.preview, null, 2).slice(0,6000)}</pre>
                        ) : previewTab==="table" ? (
                          <div className="overflow-auto">
                            <table className="w-full text-[12px]">
                              <thead className="sticky top-0 bg-[#0F0F0F] text-white font-mono text-[10px] tracking-[0.08em] uppercase">
                                <tr>{Object.keys(job.preview[0]||{}).slice(0,6).map(k=> <th key={k} className="text-left px-3 py-2 border-r border-white/10 last:border-0 whitespace-nowrap">{k}</th>)}</tr>
                              </thead>
                              <tbody>
                                {job.preview.slice(0,12).map((r,i)=>(
                                  <tr key={i} className={i%2? "bg-white":"bg-[#F5EFE6]"}>
                                    {Object.values(r).slice(0,6).map((v:any,idx)=>(
                                      <td key={idx} className="px-3 py-2 border-r border-[#0F0F0F]/10 last:border-0 truncate max-w-[180px]" title={String(v)}>{String(v).slice(0,80)}{String(v).length>80?"…":""}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : previewTab==="md" ? (
                          <div className="p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{JSON.stringify(job.preview.slice(0,3), null, 2).slice(0,3000)}</div>
                        ) : (
                          <pre className="p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{JSON.stringify(job, null, 2).slice(0,5000)}</pre>
                        )}
                      </div>
                    </div>

                    {/* logs */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-mono text-[11px] tracking-[0.1em] uppercase font-black flex items-center gap-2">Live log <span className="bg-[#0F0F0F] text-white px-1.5 py-0.5">{job.logs.length}</span></h4>
                        <div className="flex items-center gap-1.5">
                          {(["all","error","ok"] as const).map(f=>(
                            <button key={f} onClick={()=> setLogFilter(f)} className={`px-2 py-1 border font-mono text-[11px] font-bold uppercase ${logFilter===f? "bg-[#0F0F0F] text-white border-[#0F0F0F]":"bg-white border-[#0F0F0F] hover:bg-[#F5EFE6]"}`}>{f}</button>
                          ))}
                          <button onClick={()=> setAutoScroll(v=>!v)} className={`px-2 py-1 border font-mono text-[11px] font-bold ${autoScroll? "bg-[#FFC01F] border-[#0F0F0F]":"bg-white border-[#0F0F0F]"}`}>{autoScroll? "● auto":"○ auto"}</button>
                          <button onClick={()=> { if(job) navigator.clipboard.writeText(job.logs.join("\n")); }} className="px-2 py-1 bg-white border border-[#0F0F0F] font-mono text-[11px] font-bold">⎘</button>
                        </div>
                      </div>
                      <div ref={logRef} className="mt-2 bg-[#0F0F0F] text-[#E8FFD0] border-[1.5px] border-[#0F0F0F] p-3 font-mono text-[11px] leading-[1.65] max-h-[220px] overflow-auto">
                        {filteredLogs.length===0 ? <span className="opacity-50">[no logs for this filter]</span> : filteredLogs.map((l,i)=>(
                          <div key={i} className={/error|failed|fail/i.test(l)? "text-[#FF6B6B]": /done|saved|found|complete/i.test(l)? "text-[#FFC01F]":"text-[#B6FF9B]"}>
                            <span className="opacity-30">›</span> {l}
                          </div>
                        ))}
                        {running && <div className="text-[#FFC01F] animate-pulse">▍ streaming…</div>}
                      </div>
                      {job.error && <div className="mt-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] px-3 py-2 font-mono text-[12px]">{job.error}</div>}
                    </div>
                  </div>

                  {/* right: files */}
                  <div className="p-3 md:p-4 bg-[#FFFCF7] flex flex-col gap-3 min-w-0">
                    <div className="bg-white border-[1.5px] border-[#0F0F0F] shadow-[4px_4px_0_#0F0F0F] overflow-hidden">
                      <div className="bg-[#0F0F0F] text-white px-3 py-2.5 flex items-center justify-between">
                        <span className="font-mono text-[11px] tracking-[0.1em] uppercase font-black">Files • {job.files.length} • {fmtSize(job.files.reduce((a,f)=>a+f.sizeBytes,0))}</span>
                        {done && job.files.length>0 && (
                          <a href={`/api/ask/zip?id=${job.id}`} className="bg-[#FFC01F] text-[#0F0F0F] border border-white px-3 py-1 font-black text-[11px] tracking-[0.06em] uppercase hover:bg-white transition">↓ ZIP</a>
                        )}
                      </div>
                      {job.files.length===0 ? (
                        <div className="p-8 text-center">
                          <div className="w-10 h-10 mx-auto bg-[#F5EFE6] border border-[#0F0F0F] grid place-items-center animate-pulse">◈</div>
                          <div className="font-mono text-[11px] font-black tracking-[0.08em] uppercase mt-3 opacity-60">{running? "Writing files…":"No files yet"}</div>
                          <div className="text-[12px] text-zinc-500 mt-1">{running? "PDFs / parquet / READMEs streaming":"Files appear as they are validated"}</div>
                        </div>
                      ) : (
                        <div className="max-h-[340px] overflow-auto divide-y divide-[#0F0F0F]/10">
                          {job.files.map(f=>(
                            <a key={f.name} href={`/api/ask/download/${job.id}/${encodeURIComponent(f.name)}`} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#FFC01F]/15 transition group min-w-0">
                              <span className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 border font-black ${f.kind==="pdf"? "bg-[#FF3B30] text-white border-[#0F0F0F]": f.kind==="csv"? "bg-[#0B1E3C] text-white border-[#0F0F0F]": f.kind.includes("json")? "bg-[#FFC01F] text-[#0F0F0F] border-[#0F0F0F]": "bg-white text-[#0F0F0F] border-[#0F0F0F]"}`}>{f.kind}</span>
                              <span className="flex-1 min-w-0 font-mono text-[12px] truncate group-hover:underline">{f.name}</span>
                              <span className="shrink-0 font-mono text-[11px] opacity-60 tabular-nums">{fmtSize(f.sizeBytes)}</span>
                              <span className="shrink-0 w-7 h-7 border border-[#0F0F0F] bg-white grid place-items-center group-hover:bg-[#0F0F0F] group-hover:text-white transition">↓</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={()=> job && navigator.clipboard.writeText(JSON.stringify(job.preview, null, 2))} className="bg-white border-[1.5px] border-[#0F0F0F] py-2.5 font-bold text-[11px] tracking-[0.06em] uppercase hover:bg-[#0F0F0F] hover:text-white transition">⎘ Copy preview</button>
                      <a href={done && job.files.length? `/api/ask/zip?id=${job.id}`: "#"} className={`text-center border-[1.5px] border-[#0F0F0F] py-2.5 font-black text-[11px] tracking-[0.06em] uppercase transition ${done? "bg-[#FF3B30] text-white shadow-[3px_3px_0_#0F0F0F] hover:shadow-[4px_4px_0_#0F0F0F] hover:-translate-y-[1px]":"bg-zinc-100 text-zinc-400 cursor-not-allowed"}`}>Download ZIP →</a>
                    </div>

                    <div className="bg-white border border-[#0F0F0F] p-3">
                      <div className="font-mono text-[11px] font-black tracking-[0.08em] uppercase">Download path</div>
                      <code className="block mt-1 font-mono text-[11px] bg-[#F5EFE6] border border-[#0F0F0F] px-2 py-1.5 break-all">downloads/{job.id}/</code>
                      <div className="font-mono text-[10px] opacity-60 mt-1">File-backed • survives dev reload</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* HISTORY */}
          <div id="history" className="mt-6 bg-white border-[1.5px] border-[#0F0F0F] shadow-[8px_8px_0_#0F0F0F] overflow-hidden reveal">
            <div className="px-3 md:px-4 py-3 border-b-[1.5px] border-[#0F0F0F] bg-[#F5EFE6] flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-mono text-[11px] tracking-[0.12em] uppercase font-black">History</h3>
                <span className="bg-[#0F0F0F] text-white font-mono text-[11px] px-2 py-1 font-black">{filteredHistory.length}/{history.length}</span>
                <span className="hidden md:inline font-mono text-[11px] opacity-60">tap to reopen • polling every 8s</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-[#0F0F0F] p-1">
                  {["all","hr","interview","papers","dataset","github","web","images","universal"].map(k=>(
                    <button key={k} onClick={()=> setFilter(k)} className={`px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-[0.06em] border ${filter===k? "bg-[#0F0F0F] text-white border-[#0F0F0F]":"bg-white border-transparent hover:border-[#0F0F0F]"}`}>{k}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-[#0F0F0F] px-2 py-1">
                  <span className="font-mono text-[11px] opacity-60">⌕</span>
                  <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="search ask, kind, status" className="outline-none font-mono text-[12px] w-[160px] md:w-[200px] placeholder:text-zinc-400" />
                  {search && <button onClick={()=> setSearch("")} className="w-6 h-6 border border-[#0F0F0F] bg-white grid place-items-center text-[10px]">✕</button>}
                </div>
              </div>
            </div>

            {filteredHistory.length===0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 mx-auto bg-white border border-[#0F0F0F] grid place-items-center">◈</div>
                <div className="font-mono text-[11px] font-black tracking-[0.08em] uppercase mt-3 opacity-60">No history</div>
                <div className="text-[12px] text-zinc-500 mt-1">{history.length? "Try different filter/search":"Run your first scrape above"}</div>
              </div>
            ) : (
              <div className="divide-y divide-[#0F0F0F]/10 max-h-[420px] overflow-auto">
                {/* header */}
                <div className="hidden md:grid grid-cols-[1fr_110px_110px_110px_90px] gap-2 px-4 py-2 bg-[#0F0F0F] text-white font-mono text-[10px] tracking-[0.08em] uppercase font-black sticky top-0 z-10">
                  <span>Ask</span><span>Kind</span><span>Status</span><span>Files • Size</span><span className="text-right">Action</span>
                </div>
                {filteredHistory.map(h=>(
                  <div key={h.id} className={`grid grid-cols-1 md:grid-cols-[1fr_110px_110px_110px_90px] gap-2 px-4 py-3 items-center hover:bg-[#FFC01F]/10 transition group ${job?.id===h.id? "bg-[#FFC01F]/15":""}`}>
                    <div className="min-w-0">
                      <div className="font-bold text-[13px] leading-[1.3] truncate pr-2">{h.ask}</div>
                      <div className="font-mono text-[11px] opacity-60 flex flex-wrap gap-1.5 mt-0.5">
                        <span className="md:hidden bg-white border border-[#0F0F0F] px-1.5 py-0.5 font-black text-[10px] uppercase">{h.kind} • {h.status}</span>
                        <span>{timeAgo(h.createdAt)}</span><span className="hidden md:inline">•</span><span className="hidden md:inline">{h.id.slice(0,8)}</span>
                      </div>
                    </div>
                    <div className="hidden md:block"><span className={`inline-flex items-center gap-1.5 px-2 py-1 border border-[#0F0F0F] font-mono text-[11px] font-black uppercase ${kindMeta(h.kind).bg}`}>{h.kind}</span></div>
                    <div className="hidden md:block"><span className={`inline-flex px-2 py-1 border font-mono text-[11px] font-black uppercase ${h.status==="done"? "bg-emerald-500 text-white border-[#0F0F0F]": h.status==="error"? "bg-[#FF3B30] text-white border-[#0F0F0F]": "bg-[#FFC01F] text-[#0F0F0F] border-[#0F0F0F]"}`}>{h.status}</span></div>
                    <div className="hidden md:block font-mono text-[11px]"><span className="font-bold">{h.files} files</span><span className="opacity-60"> • {fmtSize(h.totalBytes)}</span><div className="opacity-60">{h.itemsDone}/{h.itemsTotal||"—"}</div></div>
                    <div className="flex md:justify-end gap-1.5">
                      <button onClick={()=> reopen(h.id)} className="flex-1 md:flex-none bg-white border-[1.5px] border-[#0F0F0F] px-3 py-1.5 font-bold text-[11px] tracking-[0.06em] uppercase shadow-[2px_2px_0_#0F0F0F] group-hover:shadow-[3px_3px_0_#0F0F0F] group-hover:-translate-y-[1px] transition">Open →</button>
                      <a href={h.status==="done"? `/api/ask/zip?id=${h.id}`:"#"} onClick={e=>{ if(h.status!=="done") e.preventDefault();}} className={`hidden md:grid w-8 h-8 place-items-center border-[1.5px] border-[#0F0F0F] text-[12px] ${h.status==="done"? "bg-[#0F0F0F] text-white hover:bg-[#FF3B30]":"bg-zinc-100 text-zinc-400 cursor-not-allowed"}`}>↓</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <footer className="mt-6 border-t-[1.5px] border-[#0F0F0F]/10 pt-4 flex flex-col md:flex-row gap-2 justify-between items-center font-mono text-[11px] px-1">
            <span className="opacity-60 text-center md:text-left">© 2026 Instant Scraper • file-backed • <code className="bg-white border border-[#0F0F0F] px-1">downloads/&lt;job&gt;/</code> • arXiv • HF • GitHub • Openverse • DuckDuckGo • JobSpy</span>
            <span className="flex gap-2 font-bold"><a href="https://github.com/AntrikshH90/instant-scraper-work" target="_blank" className="underline decoration-[#FF3B30] decoration-2">GitHub</a> • <span className="opacity-60">Keyless • Vercel ready</span></span>
          </footer>
        </section>
      </div>

      {/* CMD PALETTE */}
      {showCmd && (
        <div className="fixed inset-0 z-50 bg-[#0F0F0F]/60 backdrop-blur-sm grid place-items-center p-4" onClick={()=> setShowCmd(false)}>
          <div className="w-full max-w-[560px] bg-white border-[1.5px] border-[#0F0F0F] shadow-[12px_12px_0_#0F0F0F] overflow-hidden" onClick={e=> e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-[#0F0F0F] flex items-center gap-3">
              <span className="w-7 h-7 bg-[#0F0F0F] text-white grid place-items-center border border-[#0F0F0F]">⌘</span>
              <input autoFocus value={ask} onChange={e=> setAsk(e.target.value)} onKeyDown={e=> e.key==="Enter" && (setShowCmd(false), go())} placeholder="Ask for anything…" className="flex-1 outline-none text-[15px] font-medium placeholder:text-zinc-400" />
              <button onClick={()=> setShowCmd(false)} className="w-8 h-8 border border-[#0F0F0F] bg-white grid place-items-center">✕</button>
            </div>
            <div className="p-2 grid grid-cols-1 gap-1 max-h-[320px] overflow-auto">
              {EXAMPLES.slice(0,6).map(ex=>(
                <button key={ex.q} onClick={()=> { setAsk(ex.q); setShowCmd(false); go(ex.q); }} className="text-left px-3 py-2.5 border border-transparent hover:border-[#0F0F0F] hover:bg-[#FFC01F]/20 flex items-center gap-3">
                  <span className={`w-7 h-7 grid place-items-center border border-[#0F0F0F] text-[11px] font-black ${ex.c}`}>{ex.icon}</span>
                  <span className="text-[13px] font-medium">{ex.q}</span>
                  <span className="ml-auto font-mono text-[10px] bg-white border border-[#0F0F0F] px-1.5 py-0.5 uppercase">{ex.k}</span>
                </button>
              ))}
            </div>
            <div className="px-4 py-2 bg-[#F5EFE6] border-t border-[#0F0F0F] flex justify-between font-mono text-[11px]">
              <span className="opacity-60">↵ to run • esc to close</span>
              <span className="font-bold">{history.length} jobs in history</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
