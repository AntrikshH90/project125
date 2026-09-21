import React, {useState, useEffect, useRef} from 'react'
import {motion, AnimatePresence, useMotionValue, useSpring} from 'framer-motion'
import {Sparkles, Zap, Trophy, Gift, Search, Plus, Crown, Flame, Target, Layers, Clock3, Users, ShieldCheck, ArrowUpRight, Star, Medal, ShoppingBag, CheckCircle2, X, Trash2, Award, TrendingUp, Boxes, Rocket} from 'lucide-react'

const INITIAL_TASKS=[
  {id:1,title:"Decode Signal — Market Sentiment Engine",desc:"Build a real-time sentiment scraper for 5 trading signals. Deliver dashboard + API.",points:250,cat:"intel",diff:"Apex",time:"3d left",members:4,status:"available"},
  {id:2,title:"Neon Brand System for Apex Drop",desc:"Design next-gen visual system: logo kinetic, 3D icon pack, deck 12 slides.",points:180,cat:"design",diff:"Pro",time:"5d left",members:2,status:"available"},
  {id:3,title:"Research Vault — GenAI Agents 2026",desc:"Curate 20 breakthrough agent architectures with loom video explainer.",points:120,cat:"research",diff:"Elite",time:"2d left",members:3,status:"inProgress"},
  {id:4,title:"Ops Sprint — Onboard 50 Creators",desc:"Outreach + onboarding playbook, convert 50 micro-creators in 7 days.",points:300,cat:"ops",diff:"Apex",time:"6d left",members:6,status:"available"},
  {id:5,title:"Cinematic Landing — 3D Scroll Story",desc:"Code WebGL hero with GSAP scroll + Framer motion for Nexus page.",points:220,cat:"intel",diff:"Pro",time:"4d left",members:2,status:"completed"},
  {id:6,title:"Vault Ledger Automation",desc:"Automate points → inventory sync + anti-fraud checks with Firebase rules.",points:160,cat:"ops",diff:"Elite",time:"1d left",members:1,status:"available"},
]
const REWARDS_INIT=[
  {id:1,name:"Apex Hoodie — Stealth Black",cost:600,stock:12,icon:"🧥",rarity:"apex",desc:"Heavyweight 480gsm, puff 3D APEX chest, NFC tag."},
  {id:2,name:"MacBook Air M3 Credit ₹10k",cost:1500,stock:3,icon:"💻",rarity:"apex",desc:"Store credit toward any Apple device via Apex fund."},
  {id:3,name:"Figma Pro — 1 Year",cost:400,stock:25,icon:"🎨",rarity:"epic",desc:"Teams plan, private plugins + AI credits."},
  {id:4,name:"Amsterdam Offsite Pass",cost:2000,stock:2,icon:"✈️",rarity:"apex",desc:"Flights + stay for Apex Summit Q1."},
  {id:5,name:"Mechanical Keeb — Apex Custom",cost:550,stock:8,icon:"⌨️",rarity:"epic",desc:"Gateron Pro, PBT, hot-swap, brass plate."},
  {id:6,name:"1:1 with Founder (45m)",cost:350,stock:20,icon:"👑",rarity:"rare",desc:"Strategy teardown + referral to network."},
  {id:7,name:"Notion AI + Perplexity Pro Bundle",cost:250,stock:50,icon:"⚡",rarity:"rare",desc:"12 months, unlimited queries."},
  {id:8,name:"Mystery Drop Box",cost:180,stock:100,icon:"🎁",rarity:"rare",desc:"Random swag, credits, or golden ticket."},
]
const LEADERS=[
  {name:"Aarav S.",pts:4850,role:"Intelligence Lead",img:"https://i.pravatar.cc/100?img=15"},
  {name:"Nishchay R.",pts:4210,role:"Design Commander",img:"https://i.pravatar.cc/100?img=12"},
  {name:"You",pts:2840,role:"Nexus Operative",img:"https://i.pravatar.cc/100?img=68",me:true},
  {name:"Priya M.",pts:2610,role:"Research",img:"https://i.pravatar.cc/100?img=32"},
  {name:"Kabir D.",pts:2390,role:"Ops",img:"https://i.pravatar.cc/100?img=20"},
]

export default function App(){
  const [tab,setTab]=useState("missions")
  const [tasks,setTasks]=useState(()=>{
    try{ const s=localStorage.getItem("apex_tasks"); return s? JSON.parse(s): INITIAL_TASKS }catch{ return INITIAL_TASKS }
  })
  const [rewards,setRewards]=useState(REWARDS_INIT)
  const [points,setPoints]=useState(()=>{
    try{ return Number(localStorage.getItem("apex_points")||2840)}catch{ return 2840}
  })
  const [q,setQ]=useState("")
  const [filter,setFilter]=useState("all")
  const [showAdd,setShowAdd]=useState(false)
  const [toasts,setToasts]=useState([])
  const [claimLog,setClaimLog]=useState([])
  const [form,setForm]=useState({title:"",desc:"",points:150,cat:"intel",diff:"Pro",time:"7d left"})
  const mx=useMotionValue(0); const my=useMotionValue(0)
  const sx=useSpring(mx,{stiffness:60,damping:18}); const sy=useSpring(my,{stiffness:60,damping:18})
  const cardRef=useRef(null)

  useEffect(()=>{localStorage.setItem("apex_tasks",JSON.stringify(tasks))},[tasks])
  useEffect(()=>{localStorage.setItem("apex_points",String(points))},[points])

  const pushToast=(title,sub,icon="✓")=>{
    const id=Date.now()+Math.random()
    setToasts(t=>[...t,{id,title,sub,icon}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200)
  }
  const completeTask=(id)=>{
    setTasks(ts=>ts.map(t=> t.id===id ? {...t,status:"completed"}:t))
    const t=tasks.find(x=>x.id===id)
    if(t && t.status!=="completed"){ setPoints(p=>p+t.points); pushToast(`+${t.points} APEX points`,`“${t.title.slice(0,34)}...” completed — vault credited`,"⚡")}
  }
  const deployTask=(id)=>{
    setTasks(ts=>ts.map(t=> t.id===id ? {...t,status:"inProgress"}:t))
    pushToast("Mission deployed","You’re now assigned — make it count","🚀")
  }
  const deleteTask=(id)=> setTasks(ts=>ts.filter(t=>t.id!==id))
  const claim=(r)=>{
    if(points < r.cost) { pushToast("Insufficient points",`Need ${r.cost-points} more for ${r.name}`,"🔒"); return }
    if(r.stock<=0) return
    setPoints(p=>p-r.cost)
    setRewards(rs=>rs.map(x=> x.id===r.id? {...x,stock:x.stock-1}:x))
    setClaimLog(l=>[{id:Date.now(),item:r.name,cost:r.cost,time:new Date().toLocaleTimeString()},...l].slice(0,6))
    pushToast("Claimed — check your vault!",`${r.name} • -${r.cost} pts`,"🎉")
  }
  const filtered=tasks.filter(t=>{
    const matchQ = !q || (t.title+t.desc).toLowerCase().includes(q.toLowerCase())
    const matchF = filter==="all" || t.cat===filter || t.status===filter
    if(tab==="missions") return matchQ && matchF
    return true
  })
  const stats={
    total: tasks.length,
    completed: tasks.filter(t=>t.status==="completed").length,
    inProgress: tasks.filter(t=>t.status==="inProgress").length,
    points,
    earned: tasks.filter(t=>t.status==="completed").reduce((a,b)=>a+b.points,0)
  }

  const onHeroMove=(e)=>{
    const rect=e.currentTarget.getBoundingClientRect()
    const x=(e.clientX - rect.left - rect.width/2)/18
    const y=(e.clientY - rect.top - rect.height/2)/18
    mx.set(x); my.set(y)
  }

  return (
    <div style={{background:"#05070E",minHeight:"100vh",position:"relative"}}>
      <div className="nav-wrap">
        <div className="container nav">
          <div className="brand">
            <div className="brand-mark"><span>A</span></div>
            <div>
              <h1><b>APEX</b> INTELLIGENCE</h1>
              <p>NEXUS OS • 2026</p>
            </div>
          </div>
          <div className="nav-links">
            {[
              {k:"missions",l:"Missions"},
              {k:"vault",l:"Vault"},
              {k:"command",l:"Command"},
            ].map(b=>(
              <button key={b.k} className={tab===b.k?"active":""} onClick={()=>setTab(b.k)}>{b.l}</button>
            ))}
          </div>
          <div className="nav-actions">
            <div className="points-pill">
              <div className="points-icon"><Gem size={14}/></div>
              <div><strong>{points.toLocaleString()}</strong> <span>APEX</span></div>
            </div>
            <button className="cta-add" onClick={()=>setShowAdd(true)}><Plus size={16}/> New Task</button>
            <div className="avatar"><img src="https://i.pravatar.cc/200?img=68" alt="me"/></div>
          </div>
        </div>
      </div>

      <section className="hero" onMouseMove={onHeroMove} onMouseLeave={()=>{mx.set(0);my.set(0)}}>
        <div className="hero-grid"/>
        <div className="container hero-inner">
          <div>
            <span className="eyebrow"><i/> LIVE • 127 OPERATIVES ONLINE • SEASON 03</span>
            <motion.h2 initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.6}}>
              Your work, <br/><span>made legendary.</span>
            </motion.h2>
            <p>Apex Intelligence is a <b style={{color:"#fff"}}>points-powered mission OS</b> — ship tasks, earn APEX, redeem real rewards. Built like a game, engineered like a growth engine. Dark, cinematic, obsessively smooth.</p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={()=>setTab("missions")}>Enter Missions <ArrowUpRight size={16}/></button>
              <button className="btn-ghost" onClick={()=>setTab("vault")}><Gift size={16} style={{marginRight:6,verticalAlign:"middle"}}/> Open Vault • {rewards.length} drops</button>
            </div>
            <div className="hero-stats">
              <div className="stat-card"><label>TOTAL MISSIONS</label><strong>{stats.total}</strong><span>{stats.completed} completed • {stats.inProgress} active</span></div>
              <div className="stat-card"><label>VAULT VALUE</label><strong>₹ {rewards.reduce((a,b)=>a+b.cost,0).toLocaleString()}</strong><span>Points economy live</span></div>
              <div className="stat-card"><label>YOUR RANK</label><strong>#03 <TrendingUp size={16} style={{display:"inline",verticalAlign:"middle",color:"#10F090"}}/></strong><span>Top 2% — keep shipping</span></div>
            </div>
          </div>

          <div className="showcase">
            <div className="orbit"/>
            <div className="orbit orbit2"/>
            <div className="glow-orb"/>
            <motion.div ref={cardRef} className="card-3d" style={{rotateY:sx,rotateX:sy}} transition={{type:"spring"}} >
              <div className="card-top">
                <span className="badge-live">● APEX PROTOCOL • ACTIVE</span>
                <Crown size={16} color="#FFD60A"/>
              </div>
              <h3>Deploy. Earn.<br/>Ascend.</h3>
              <p>Every task is a quest with meaningful points. Redeem for gear, credits, and once-in-a-lifetime access.</p>
              <div className="mini-grid">
                <div className="mini"><label>THIS WEEK</label><strong>+ {stats.earned} pts</strong><div className="progress"><i style={{width:"72%"}}/></div></div>
                <div className="mini"><label>VAULT ITEMS</label><strong>{rewards.filter(r=>points>=r.cost).length} unlockable</strong><div className="progress"><i style={{width:"55%",background:"linear-gradient(90deg,#FFD60A,#FF2E93)"}}/></div></div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <span style={{fontSize:11,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.08)",padding:"6px 10px",borderRadius:999,display:"inline-flex",alignItems:"center",gap:6}}><Flame size={12} color="#FF8A00"/> 9 day streak</span>
                <span style={{fontSize:11,background:"rgba(16,240,144,0.12)",border:"1px solid rgba(16,240,144,0.25)",padding:"6px 10px",borderRadius:999,color:"#B6FFDE",display:"inline-flex",alignItems:"center",gap:6}}><ShieldCheck size={12}/> Verified org</span>
              </div>
              <div className="floating-avatars">
                <img src="https://i.pravatar.cc/100?img=11"/><img src="https://i.pravatar.cc/100?img=22"/><img src="https://i.pravatar.cc/100?img=33"/><img src="https://i.pravatar.cc/100?img=44"/>
                <span style={{marginLeft:8,background:"#fff",color:"#05070E",fontSize:11,fontWeight:800,padding:"6px 10px",borderRadius:999,alignSelf:"center"}}>+127</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container">
        {tab==="missions" && (
          <section className="section">
            <div className="section-head">
              <div>
                <h3><Target size={20} style={{verticalAlign:"middle",marginRight:8,color:"#00E5FF"}}/> Mission Board</h3>
                <p>Curated ops for builders. Deploy, deliver, get paid in points. Admins can add missions instantly — no backend needed (local + future Supabase).</p>
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                <div className="search"><Search size={16}/><input placeholder="Search missions, tags, intelligence..." value={q} onChange={e=>setQ(e.target.value)}/></div>
              </div>
            </div>
            <div className="filters" style={{marginBottom:14}}>
              {[
                ["all","All"],["available","Available"],["inProgress","In Progress"],["completed","Completed"],["intel","Intel"],["design","Design"],["research","Research"],["ops","Ops"]
              ].map(([v,l])=> <button key={v} className={`chip ${filter===v?"active":""}`} onClick={()=>setFilter(v)}>{l}</button>)}
            </div>
            <div className="tasks-grid">
              <AnimatePresence mode="popLayout">
              {filtered.map(t=>(
                <motion.div layout key={t.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.96}} className={`task-card ${t.status==="completed"?"completed":""}`}>
                  {t.status==="completed" && <div className="ribbon">COMPLETED</div>}
                  <div className="task-top">
                    <span className={`cat ${t.cat}`}>{t.cat.toUpperCase()} • {t.diff}</span>
                    <span className="pts"><i>◆</i> {t.points}</span>
                  </div>
                  <h4>{t.title}</h4>
                  <p>{t.desc}</p>
                  <div className="meta">
                    <span><Clock3 size={12}/> {t.time}</span>
                    <span><Users size={12}/> {t.members} joined</span>
                    <span><Layers size={12}/> {t.status}</span>
                  </div>
                  <div className="task-actions">
                    {t.status==="available" && <button className="btn-sm btn-deploy" onClick={()=>deployTask(t.id)}><Rocket size={14}/> Deploy</button>}
                    {t.status==="inProgress" && <button className="btn-sm btn-done" onClick={()=>completeTask(t.id)}><CheckCircle2 size={14}/> Mark Done</button>}
                    {t.status==="completed" && <button className="btn-sm btn-ghost-sm" disabled>✓ Rewarded +{t.points}</button>}
                    <button className="btn-sm btn-ghost-sm" onClick={()=>deleteTask(t.id)}><Trash2 size={14}/></button>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
            {filtered.length===0 && <div style={{textAlign:"center",padding:40,color:"#9AA4C2"}}>No missions match your filters — try clearing search or create a new task.</div>}
          </section>
        )}

        {tab==="vault" && (
          <section className="section">
            <div className="section-head">
              <div>
                <h3><Gift size={20} style={{verticalAlign:"middle",marginRight:8,color:"#FFD60A"}}/> Reward Vault</h3>
                <p>Redeem APEX points for real drops. Apple devices, offsites, tools, and mystery boxes. Points are the flex.</p>
              </div>
              <div className="points-pill" style={{background:"rgba(255,255,255,0.06)",borderColor:"rgba(255,255,255,0.12)"}}>
                <div className="points-icon"><Trophy size={14}/></div>
                <div><strong>{points.toLocaleString()}</strong> <span>balance • {claimLog.length} claims</span></div>
              </div>
            </div>
            <div className="vault-grid">
              {rewards.map(r=>{
                const can=points>=r.cost && r.stock>0
                return (
                  <div key={r.id} className="reward-card">
                    <div className="reward-media" style={{background: r.rarity==="apex" ? "radial-gradient(400px 180px at 50% 0%, rgba(255,214,10,0.28), transparent 70%), linear-gradient(180deg, rgba(124,58,237,0.25), rgba(10,15,31,0.9))" : r.rarity==="epic" ? "radial-gradient(400px 180px at 50% 0%, rgba(124,58,237,0.35), transparent 70%), linear-gradient(180deg, rgba(0,229,255,0.18), rgba(10,15,31,0.9))" : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(10,15,31,0.9))"}}>
                      <span className={`rarity ${r.rarity}`}>{r.rarity.toUpperCase()}</span>
                      <div className="reward-icon">{r.icon}</div>
                    </div>
                    <div className="reward-body">
                      <h4>{r.name}</h4>
                      <p>{r.desc}</p>
                      <div className="reward-foot">
                        <div className="cost"><i>◆</i> {r.cost.toLocaleString()}</div>
                        <span className="stock">{r.stock} left</span>
                      </div>
                      <button className={`redeem ${can?"available":"locked"}`} onClick={()=>claim(r)}>
                        {r.stock<=0 ? "Sold Out" : can ? <><ShoppingBag size={14} style={{verticalAlign:"middle",marginRight:6}}/> Redeem Now</> : `Need ${(r.cost-points).toLocaleString()} more`}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {claimLog.length>0 && (
              <div className="panel" style={{marginTop:16}}>
                <h4><Star size={16} style={{verticalAlign:"middle",marginRight:6, color:"#FFD60A"}}/> Recent claims</h4>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
                  {claimLog.map(c=> <span key={c.id} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",padding:"8px 12px",borderRadius:999,fontSize:12}}>{c.item} • -{c.cost} • {c.time}</span>)}
                </div>
              </div>
            )}
          </section>
        )}

        {tab==="command" && (
          <section className="section">
            <div className="two-col">
              <div className="panel">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <h4><Medal size={18} style={{verticalAlign:"middle",marginRight:6,color:"#FFD60A"}}/> Leaderboard — Season 03</h4>
                  <span style={{fontFamily:"JetBrains Mono",fontSize:11,color:"#9AA4C2"}}>Resets in 12d 04h</span>
                </div>
                <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
                  {LEADERS.map((u,i)=>(
                    <div key={u.name} className="lb-row" style={u.me?{background:"linear-gradient(90deg, rgba(124,58,237,0.18), rgba(0,229,255,0.12))",borderColor:"rgba(124,58,237,0.35)"}:undefined}>
                      <div className={`rank ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>{i<3? ["🥇","🥈","🥉"][i] : `#${i+1}`}</div>
                      <img src={u.img} alt="" style={{width:38,height:38,borderRadius:999,border:"2px solid rgba(255,255,255,0.12)"}}/>
                      <div className="lb-name"><strong>{u.name} {u.me && "• you"}</strong><span>{u.role}</span></div>
                      <div className="lb-pts">{u.pts.toLocaleString()} <span style={{color:"#9AA4C2",fontSize:11}}>APEX</span></div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:14,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:"#9AA4C2"}}><Award size={12} style={{verticalAlign:"middle",marginRight:6}}/> Top 3 get Apex Summit invites + mystery box</span>
                  <span style={{fontWeight:800, fontSize:12, background:"#fff", color:"#05070E", padding:"6px 10px", borderRadius:999}}>View Full Board</span>
                </div>
              </div>
              <div className="panel">
                <h4><Boxes size={18} style={{verticalAlign:"middle",marginRight:6,color:"#00E5FF"}}/> Activity & Controls</h4>
                <div className="activity">
                  <div className="act"><i style={{background:"rgba(124,58,237,0.18)",color:"#C4B5FD"}}><Zap size={16}/></i><div><strong>Aarav completed “Sentiment Engine”</strong><span> +250 pts • 2h ago</span></div></div>
                  <div className="act"><i style={{background:"rgba(255,214,10,0.18)",color:"#FFD60A"}}><Gift size={16}/></i><div><strong>Priya claimed Notion Bundle</strong><span> -250 pts • 5h ago</span></div></div>
                  <div className="act"><i style={{background:"rgba(16,240,144,0.14)",color:"#10F090"}}><CheckCircle2 size={16}/></i><div><strong>You deployed Ops Sprint</strong><span> Mission now active</span></div></div>
                </div>
                <div style={{marginTop:14,display:"grid",gap:10}}>
                  <button className="btn-sm btn-deploy" style={{width:"100%"}} onClick={()=>setShowAdd(true)}><Plus size={14}/> Create Mission (Admin)</button>
                  <button className="btn-sm btn-ghost-sm" style={{width:"100%"}} onClick={()=>{setPoints(2840); setTasks(INITIAL_TASKS); pushToast("Reset to demo data","Points & missions restored","↺")}}><Trash2 size={14}/> Reset Demo</button>
                  <div style={{background:"linear-gradient(135deg, #7C3AED, #00E5FF)",borderRadius:16,padding:14,color:"white"}}>
                    <strong style={{fontFamily:"Syne",fontSize:14}}>Apex is hiring — Intelligence OS</strong>
                    <p style={{fontSize:12,opacity:0.9,marginTop:4,lineHeight:1.5}}>We reward shipping, not hours. Top vault claimers get invited to build the OS itself.</p>
                    <a href="#" style={{display:"inline-flex",marginTop:10,background:"white",color:"#0A0F1F",padding:"8px 12px",borderRadius:999,fontWeight:800,fontSize:12}}>Apply as Operative →</a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="footer">
        <div className="container footer-inner">
          <div>© 2026 APEX INTELLIGENCE • Nexus OS • Crafted with precision • <span style={{color:"#fff"}}>apex.intelligence</span></div>
          <div style={{display:"flex",gap:14}}><span>Privacy</span><span>Terms</span><span>Status ● Operational</span></div>
        </div>
      </footer>

      <AnimatePresence>
        {showAdd && (
          <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setShowAdd(false)}>
            <motion.div className="modal" initial={{y:16,opacity:0,scale:0.98}} animate={{y:0,opacity:1,scale:1}} exit={{y:10,opacity:0}} onClick={e=>e.stopPropagation()}>
              <div className="modal-head">
                <h4><Sparkles size={16} style={{verticalAlign:"middle",marginRight:8,color:"#7C3AED"}}/> Create New Mission</h4>
                <button onClick={()=>setShowAdd(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.08)",width:32,height:32,borderRadius:999,display:"grid",placeItems:"center"}}><X size={14}/></button>
              </div>
              <div className="modal-body">
                <div className="field"><label>MISSION TITLE</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g., Launch Apex Referral Engine"/></div>
                <div className="field"><label>BRIEF</label><textarea value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} placeholder="What does success look like? Deliverables, links, criteria..."/></div>
                <div className="grid2">
                  <div className="field"><label>POINTS REWARD</label><input type="number" value={form.points} onChange={e=>setForm({...form,points:Number(e.target.value)})}/></div>
                  <div className="field"><label>DEADLINE</label><input value={form.time} onChange={e=>setForm({...form,time:e.target.value})} placeholder="3d left"/></div>
                </div>
                <div className="grid2">
                  <div className="field"><label>CATEGORY</label><select value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})}><option value="intel">Intel</option><option value="design">Design</option><option value="research">Research</option><option value="ops">Ops</option></select></div>
                  <div className="field"><label>DIFFICULTY</label><select value={form.diff} onChange={e=>setForm({...form,diff:e.target.value})}><option>Pro</option><option>Elite</option><option>Apex</option></select></div>
                </div>
              </div>
              <div className="modal-foot">
                <button className="btn-ghost-sm btn-sm" onClick={()=>setShowAdd(false)}>Cancel</button>
                <button className="btn-sm btn-deploy" onClick={()=>{
                  if(!form.title){pushToast("Add a title","Mission title is required","⚠");return}
                  const nt={id:Date.now(),title:form.title,desc:form.desc||"New mission — details to be added.",points:Number(form.points)||100,cat:form.cat,diff:form.diff,time:form.time,members:1,status:"available"}
                  setTasks(t=>[nt,...t]); setShowAdd(false); setForm({title:"",desc:"",points:150,cat:"intel",diff:"Pro",time:"7d left"}); pushToast("Mission published","Live on board — operatives can deploy now","✨")
                }}>Publish Mission</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="toasts">
        <AnimatePresence>
          {toasts.map(t=>(
            <motion.div key={t.id} initial={{opacity:0,y:10,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:6}} className="toast">
              <i>{t.icon}</i>
              <div><strong>{t.title}</strong><br/><span>{t.sub}</span></div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}