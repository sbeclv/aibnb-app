import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
const SUPABASE_URL = "https://arpiejcvaafrfibnjijv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_39WY5LXulvzYokKDNs_CLQ_6U7z7dRp";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const C = {
  bg: "#F8F8FF", card: "#FFFFFF", border: "#E2E2F0",
  primary: "#6B6BF5", primaryLight: "#8A8AF8", primaryGlow: "#6B6BF512",
  text: "#1A1A2E", muted: "#6B6B8A", white: "#FFFFFF",
  green: "#16A34A", greenBg: "#F0FDF4", greenBorder: "#BBF7D0",
  red: "#DC2626", redBg: "#FEF2F2", redBorder: "#FECACA",
  yellow: "#D97706", yellowBg: "#FFFBEB", yellowBorder: "#FDE68A",
  gold: "#B45309", goldLight: "#D97706",
  shadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)",
  shadowLg: "0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05)",
};

const CALENDAR_URL_SINGLE = "https://api.leadconnectorhq.com/widget/booking/ruC0Fk3XO720hOxkMiYz";

const ADMIN = { wpp: "+88888888", pass: "8888" };

// ── CONTEXT GLOBAL ────────────────────────────────────────────────────────────
const AppContext = createContext();

function AppProvider({ children }) {
  const [users, setUsers] = useState({});
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("users").select("*");
      if (error) throw error;
      const usersObj = {};
      data?.forEach(u => {
        usersObj[u.wpp] = {
          pass: u.pass,
          name: u.name,
          plan: u.plan,
          status: u.status,
          op: u.op,
          start: u.start_date,
          end: u.end_date,
          listings: [],
          renewal: u.renewal,
          city: u.city,
          meetEnabled: u.meet_enabled,
          correo: u.correo,
          country: u.country || "USD",
          airbnb_link: u.airbnb_link,
          precio_base: u.precio_base,
          precio_base_fds: u.precio_base_fds,
          estrategia: u.estrategia,
          estado_precios: u.estado_precios,
        };
      });
      setUsers(usersObj);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();

    const channel = supabase
      .channel("users")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        loadUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadUsers]);

  return (
    <AppContext.Provider value={{ users, setUsers, session, setSession, loading, loadUsers }}>
      {children}
    </AppContext.Provider>
  );
}

function useApp() {
  return useContext(AppContext);
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────
const fmtDate = d => new Date(d).toLocaleDateString("es", { day:"numeric", month:"short", year:"numeric" });
const daysLeft = (a,b) => Math.max(0, Math.ceil((new Date(b)-new Date(a))/86400000));

const Logo = ({ size=34 }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
    <svg width={size} height={size*0.6} viewBox="0 0 80 48">
      <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8A8AF8"/><stop offset="100%" stopColor="#6B6BF5"/></linearGradient></defs>
      <path d="M4 44 L28 4 L40 24 L52 4 L76 44" stroke="url(#lg)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="72" cy="8" r="6" fill="#3D3D7A"/>
      <path d="M30 28 L36 20 L42 28 L36 36 Z" fill="#3D3D7A"/>
    </svg>
    <div>
      <div style={{ fontWeight:800, fontSize:size*0.38, color:C.text }}>AiBnb <span style={{ color:C.primary }}>Pro</span></div>
      <div style={{ fontSize:size*0.22, color:C.muted, letterSpacing:"1.5px", textTransform:"uppercase" }}>by Nomada Rental</div>
    </div>
  </div>
);

const StatusBadge = ({ type }) => {
  const m = {
    active: { l:"ACTIVA", bg:C.greenBg, br:C.greenBorder, c:C.green },
    cancelled: { l:"CANCELADA", bg:C.redBg, br:C.redBorder, c:C.red },
    done: { l:"TERMINADA", bg:C.greenBg, br:C.greenBorder, c:C.green },
    progress: { l:"EN CURSO", bg:C.yellowBg, br:C.yellowBorder, c:C.yellow },
    pending: { l:"PENDIENTE", bg:"#F5F5FF", br:C.border, c:C.muted },
  };
  const s = m[type]||m.pending;
  return <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:s.bg, border:"1px solid "+s.br, borderRadius:100, padding:"4px 12px" }}><div style={{ width:6, height:6, borderRadius:"50%", background:s.c }}/><span style={{ fontSize:10, fontWeight:700, color:s.c, letterSpacing:"0.5px" }}>{s.l}</span></div>;
};

// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
function LoginPage() {
  const nav = useNavigate();
  const { users, setSession } = useApp();
  const [wpp, setWpp] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const inp = { width:"100%", background:C.white, border:"1px solid "+C.border, borderRadius:8, padding:"11px 14px", color:C.text, fontSize:14, boxSizing:"border-box", outline:"none", fontFamily:"inherit", boxShadow:C.shadow };

  const handle = () => {
    setLoading(true); setErr("");
    setTimeout(()=>{
      if(wpp.trim()===ADMIN.wpp&&pass===ADMIN.pass) {
        setSession({role:"admin",wpp:null});
        nav("/app");
      }
      else { 
        const u=users[wpp.trim()]; 
        if(u&&u.pass===pass) {
          setSession({role:"user",wpp:wpp.trim()});
          nav("/app");
        } 
        else setErr("WhatsApp o contraseña incorrectos."); 
      }
      setLoading(false);
    },700);
  };

  return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", padding:24 }}>
      <div style={{ maxWidth:380, width:"100%" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}><Logo size={36}/><p style={{ color:C.muted, fontSize:13, marginTop:10 }}>Accede a tu dashboard</p></div>
        <div style={{ background:C.white, border:"1px solid "+C.border, borderRadius:20, padding:"26px 22px", boxShadow:C.shadowLg }}>
          <h2 style={{ fontSize:19, fontWeight:800, marginBottom:18 }}>Iniciar sesión</h2>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:10, color:C.muted, display:"block", marginBottom:5, fontWeight:700, letterSpacing:"0.8px" }}>WHATSAPP</label>
            <input value={wpp} onChange={e=>setWpp(e.target.value)} placeholder="+503 7000 0001" style={inp} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:10, color:C.muted, display:"block", marginBottom:5, fontWeight:700, letterSpacing:"0.8px" }}>CONTRASEÑA</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" style={inp} onKeyDown={e=>e.key==="Enter"&&handle()}/>
          </div>
          {err&&<div style={{ background:C.redBg, border:"1px solid "+C.redBorder, borderRadius:8, padding:"9px 12px", fontSize:12, color:C.red, marginBottom:14 }}>{err}</div>}
          <button onClick={handle} disabled={loading} style={{ width:"100%", background:"linear-gradient(135deg,"+C.primaryLight+","+C.primary+")", color:"#fff", border:"none", borderRadius:10, padding:"13px 0", fontWeight:700, fontSize:14, cursor:"pointer", boxShadow:"0 4px 12px "+C.primary+"40" }}>
            {loading?"Verificando...":"Entrar →"}
          </button>
          <p style={{ textAlign:"center", color:C.muted, fontSize:12, marginTop:14 }}>¿Problemas? <a href="https://wa.me/50368205867" target="_blank" rel="noreferrer" style={{color:C.primary}}>WhatsApp de soporte</a></p>
        </div>
      </div>
    </div>
  );
}

// ── USER DASHBOARD ────────────────────────────────────────────────────────────
function UserDashboard({ user }) {
  const today=new Date().toISOString().split('T')[0];
  const dl=daysLeft(today,user.end);
  const dt=daysLeft(user.start,user.end);
  const progress=dt > 0 ? Math.min(100,Math.max(0,Math.round(((dt-dl)/dt)*100))) : 0;
  const planColor=user.plan==="Anual"?C.gold:user.plan==="Pro"?C.primary:C.muted;
  const { setSession } = useApp();
  const nav = useNavigate();
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const { data } = await supabase.from("user_logs").select("*").order("created_at", { ascending: false }).limit(10);
        setLogs(data || []);
      } catch (err) {
        console.error("Error cargando logs:", err);
      }
    };

    if (showLogs) loadLogs();
  }, [showLogs]);

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'Inter',sans-serif", color:C.text }}>
      <nav style={{ borderBottom:"1px solid "+C.border, padding:"13px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", background:C.white, position:"sticky", top:0, zIndex:100, boxShadow:C.shadow }}>
        <Logo size={28}/>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,"+C.primaryLight+","+C.primary+")", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, color:"#fff" }}>{user.name.charAt(0)}</div>
          <button onClick={()=>{setSession(null);nav("/login");}} style={{ background:"transparent", border:"1px solid "+C.border, borderRadius:8, padding:"6px 12px", color:C.muted, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Salir</button>
        </div>
      </nav>
      <div style={{ maxWidth:780, margin:"0 auto", padding:"28px 20px" }}>
        {user.status==="cancelled"&&(
          <div style={{ background:C.redBg, border:"1px solid "+C.redBorder, borderRadius:14, padding:"14px 18px", marginBottom:22, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div><div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>Tu plan está inactivo</div><div style={{ fontSize:11, color:C.muted }}>Reactiva para volver a tener el pricing activo.</div></div>
            </div>
            <a href="https://aibnbintelligence.com/tier" style={{ background:"linear-gradient(135deg,"+C.primaryLight+","+C.primary+")", color:"#fff", border:"none", borderRadius:10, padding:"9px 18px", fontWeight:700, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", textDecoration:"none", display:"inline-block" }}>🚀 Reactivar plan</a>
          </div>
        )}
        <div style={{ marginBottom:22 }}>
          <h1 style={{ fontSize:"clamp(18px,3vw,24px)", fontWeight:900, margin:"0 0 4px" }}>Hola, {user.name.split(" ")[0]} 👋</h1>
          <p style={{ color:C.muted, fontSize:13, margin:0 }}>{user.city} · Plan <span style={{ color:planColor, fontWeight:700 }}>{user.plan}</span></p>
        </div>

        {/* CARDS PRINCIPALES */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }} className="ud-g2">
          <div style={{ background:C.white, border:"1px solid "+(user.status==="active"?C.greenBorder:C.redBorder), borderRadius:16, padding:"20px 18px", boxShadow:C.shadow }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:10 }}>Suscripción</div>
            <StatusBadge type={user.status}/>
            <div style={{ marginTop:12, fontSize:20, fontWeight:900, color:planColor }}>Plan {user.plan}</div>
            {user.renewal&&user.status==="active"&&<div style={{ marginTop:10, fontSize:11, color:C.muted, background:C.bg, borderRadius:8, padding:"7px 10px", lineHeight:1.5 }}>Renovación:<br/><strong style={{color:C.text}}>USD ${user.renewal.toFixed(2)}/mes</strong></div>}
          </div>
          <div style={{ background:C.white, border:"1px solid "+(user.op==="done"?C.greenBorder:user.op==="progress"?C.yellowBorder:C.border), borderRadius:16, padding:"20px 18px", boxShadow:C.shadow }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:10 }}>Optimización</div>
            <StatusBadge type={user.op}/>
            <div style={{ marginTop:12, fontSize:12, color:C.muted, lineHeight:1.6 }}>
              {user.op==="done"&&<span style={{color:C.green}}>✓ Anuncio optimizado y pricing activo.</span>}
              {user.op==="progress"&&<span style={{color:C.yellow}}>⏳ Nuestro equipo está trabajando en tu anuncio.</span>}
              {user.op==="pending"&&<span>Tu OP aún no ha comenzado. Contáctanos.</span>}
            </div>
          </div>
        </div>

        {/* PERÍODO */}
        <div style={{ background:C.white, border:"1px solid "+C.border, borderRadius:16, padding:"20px 18px", marginBottom:12, boxShadow:C.shadow }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase" }}>Período AiBnb Pro</div>
            <div style={{ fontSize:12, color:user.status==="active"?C.primary:C.muted, fontWeight:700 }}>{user.status==="active"?dl+" días restantes":"Período finalizado"}</div>
          </div>
          <div style={{ height:6, background:C.border, borderRadius:100, marginBottom:12, overflow:"hidden" }}>
            <div style={{ height:"100%", width:progress+"%", background:user.status==="active"?"linear-gradient(90deg,"+C.primaryLight+","+C.primary+")":C.red, borderRadius:100 }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[{l:"Inicio",v:fmtDate(user.start)},{l:"Vencimiento",v:fmtDate(user.end)},{l:"Días activos",v:(dt-dl)+" / "+dt}].map(s=>(
              <div key={s.l} style={{ background:C.bg, borderRadius:10, padding:"10px 8px", textAlign:"center", border:"1px solid "+C.border }}>
                <div style={{ fontSize:9, color:C.muted, marginBottom:4, fontWeight:600 }}>{s.l}</div>
                <div style={{ fontSize:12, fontWeight:700 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DETALLES DEL PLAN */}
        <div style={{ background:C.white, border:"1px solid "+C.border, borderRadius:16, padding:"20px 18px", marginBottom:12, boxShadow:C.shadow }}>
          <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:14 }}>Detalles del plan</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px", border:"1px solid "+C.border }}>
              <div style={{ fontSize:9, color:C.muted, marginBottom:3, fontWeight:600 }}>VALOR PLAN</div>
              <div style={{ fontSize:16, fontWeight:900, color:C.primary }}>USD ${user.renewal ? user.renewal.toFixed(2) : "0.00"}</div>
            </div>
            <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px", border:"1px solid "+C.border }}>
              <div style={{ fontSize:9, color:C.muted, marginBottom:3, fontWeight:600 }}>PAÍS / MONEDA</div>
              <div style={{ fontSize:14, fontWeight:900, color:C.text }}>{user.country || "USD"}</div>
            </div>
            {user.airbnb_link && (
              <div style={{ gridColumn:"1 / -1", background:C.primaryGlow, borderRadius:10, padding:"12px 14px", border:"1px solid "+C.primary+"40" }}>
                <div style={{ fontSize:9, color:C.muted, marginBottom:3, fontWeight:600 }}>TU ANUNCIO AIRBNB</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <a href={user.airbnb_link} target="_blank" rel="noreferrer" style={{ fontSize:13, fontWeight:700, color:C.primary, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4, flex:1 }}>
                    🏠 {user.airbnb_link.substring(0,35)}...
                  </a>
                  <a href={user.airbnb_link} target="_blank" rel="noreferrer" style={{ background:C.primary, color:"#fff", padding:"5px 12px", borderRadius:6, fontWeight:600, fontSize:11, textDecoration:"none" }}>
                    Ir →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PRECIOS Y ESTRATEGIA */}
        {(user.precio_base || user.precio_base_fds || user.estrategia) && (
          <div style={{ background:C.white, border:"1px solid "+C.border, borderRadius:16, padding:"20px 18px", marginBottom:12, boxShadow:C.shadow }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:14 }}>Configuración de precios</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              {user.precio_base && (
                <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px", border:"1px solid "+C.border }}>
                  <div style={{ fontSize:9, color:C.muted, marginBottom:3, fontWeight:600 }}>PRECIO BASE</div>
                  <div style={{ fontSize:16, fontWeight:900, color:C.green }}>USD ${parseFloat(user.precio_base).toFixed(2)}</div>
                </div>
              )}
              {user.precio_base_fds && (
                <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px", border:"1px solid "+C.border }}>
                  <div style={{ fontSize:9, color:C.muted, marginBottom:3, fontWeight:600 }}>PRECIO FDS</div>
                  <div style={{ fontSize:16, fontWeight:900, color:C.gold }}>USD ${parseFloat(user.precio_base_fds).toFixed(2)}</div>
                </div>
              )}
            </div>
            {user.estrategia && (
              <div style={{ background:C.primaryGlow, borderRadius:10, padding:"12px 14px", border:"1px solid "+C.primary+"40", marginBottom:12 }}>
                <div style={{ fontSize:9, color:C.muted, marginBottom:3, fontWeight:600 }}>ESTRATEGIA</div>
                <div style={{ fontSize:13, color:C.text, lineHeight:1.5 }}>{user.estrategia}</div>
              </div>
            )}
            {user.estado_precios && (
              <div style={{ background:C.bg, borderRadius:10, padding:"10px 12px", textAlign:"center", border:"1px solid "+C.border }}>
                <div style={{ fontSize:9, color:C.muted, marginBottom:3, fontWeight:600 }}>ESTADO</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>
                  {user.estado_precios === "CRITICO" && "🔴 CRÍTICO"}
                  {user.estado_precios === "ESTABLE" && "🟡 ESTABLE"}
                  {user.estado_precios === "MEJORAR FOTOS" && "📸 MEJORAR FOTOS"}
                  {user.estado_precios === "IDEAL" && "🟢 IDEAL"}
                  {user.estado_precios === "ACTIVACION" && "⚡ ACTIVACIÓN"}
                  {user.estado_precios === "PERSONALIZADO" && "⚙️ PERSONALIZADO"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACCIONES */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }} className="ud-g2">
          {user.meetEnabled && (
            <a href={CALENDAR_URL_SINGLE} target="_blank" rel="noreferrer" style={{ background:"linear-gradient(135deg,#3B82F6,#2563EB)", color:"#fff", border:"none", borderRadius:12, padding:"14px 18px", fontWeight:700, fontSize:13, cursor:"pointer", textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 12px #3B82F640" }}>
              📅 Agendar meet
            </a>
          )}
          {!user.meetEnabled && (
            <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:"14px 18px", fontWeight:700, fontSize:13, color:C.muted, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              📅 Meet deshabilitado
            </div>
          )}
          <a href="https://wa.me/50368205867" target="_blank" rel="noreferrer" style={{ background:"#25D366", color:"#fff", border:"none", borderRadius:12, padding:"14px 18px", fontWeight:700, fontSize:13, cursor:"pointer", textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 12px #25D36640" }}>
            💬 Soporte WhatsApp
          </a>
        </div>

        {/* HISTORIAL */}
        <div style={{ background:C.white, border:"1px solid "+C.border, borderRadius:16, padding:"20px 18px", boxShadow:C.shadow }}>
          <button onClick={() => setShowLogs(!showLogs)} style={{ width:"100%", background:"transparent", border:"none", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", padding:0, fontFamily:"inherit" }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.8px", textTransform:"uppercase" }}>Historial de cambios</div>
            <span style={{ fontSize:14, color:showLogs?C.primary:C.muted }}>⌄</span>
          </button>
          {showLogs && (
            <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid "+C.border }}>
              {logs.length === 0 ? (
                <div style={{ textAlign:"center", padding:"20px", color:C.muted, fontSize:12 }}>No hay cambios registrados</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {logs.map(log => (
                    <div key={log.id} style={{ background:C.bg, borderRadius:10, padding:"10px 12px", fontSize:11, border:"1px solid "+C.border }}>
                      <div style={{ fontWeight:700, color:C.text, marginBottom:3 }}>{log.action} • {log.changed_field}</div>
                      <div style={{ color:C.muted, fontSize:10 }}>{fmtDate(log.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p style={{ textAlign:"center", color:C.muted, fontSize:11, marginTop:16 }}>AiBnb Pro · <a href="https://instagram.com/aibnbintelligence" style={{color:C.primary}}>@aibnbintelligence</a></p>
      </div>
      <style>{`@media(max-width:480px){.ud-g2{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const { users, setSession, loadUsers } = useApp();
  const nav = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editWpp, setEditWpp] = useState(null);
  const [form, setForm] = useState({ wpp:"", pass:"", nombre:"", correo:"", ciudad:"", plan:"Pro", status:"active", op:"pending", start_date:"", end_date:"", plan_value:"", airbnb_link:"", country:"USD", meet_enabled:true, precio_base:"", precio_base_fds:"", estrategia:"", estado_precios:"CRITICO" });
  const [err, setErr] = useState("");

  const all = Object.entries(users);
  const active = all.filter(([,u]) => u.status === "active").length;
  const mrr = all.filter(([,u]) => u.status === "active").reduce((s,[,u]) => s+(u.plan==="Pro"?49.99/3:u.plan==="Anual"?149/12:14.99), 0);

  const handleSave = async () => {
    if (!form.wpp || !form.pass || !form.nombre || !form.correo) {
      setErr("Completa todos los campos requeridos");
      return;
    }

    setErr("");
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);
    const endStr = endDate.toISOString().split('T')[0];

    try {
      if (editWpp) {
        const { error } = await supabase.from("users").update({
          pass: form.pass,
          name: form.nombre,
          correo: form.correo,
          city: form.ciudad,
          plan: form.plan,
          status: form.status,
          op: form.op,
          start_date: form.start_date,
          end_date: form.end_date,
          plan_value: parseFloat(form.plan_value) || 0,
          airbnb_link: form.airbnb_link,
          country: form.country,
          meet_enabled: form.meet_enabled,
          precio_base: parseFloat(form.precio_base) || 0,
          precio_base_fds: parseFloat(form.precio_base_fds) || 0,
          estrategia: form.estrategia,
          estado_precios: form.estado_precios,
        }).eq("wpp", editWpp);
        if (error) throw error;
        alert("✅ Usuario actualizado correctamente");
      } else {
        const { error } = await supabase.from("users").insert({
          wpp: form.wpp,
          pass: form.pass,
          name: form.nombre,
          correo: form.correo,
          city: form.ciudad,
          plan: form.plan,
          status: form.status,
          op: form.op || "pending",
          start_date: form.start_date || today,
          end_date: form.end_date || endStr,
          renewal: parseFloat(form.plan_value) || 14.99,
          meet_enabled: form.meet_enabled,
          plan_value: parseFloat(form.plan_value) || 0,
          airbnb_link: form.airbnb_link,
          country: form.country,
          precio_base: parseFloat(form.precio_base) || 0,
          precio_base_fds: parseFloat(form.precio_base_fds) || 0,
          estrategia: form.estrategia,
          estado_precios: form.estado_precios,
        });
        if (error) throw error;
        alert("✅ Usuario creado correctamente");
      }

      setShowModal(false);
      setEditWpp(null);
      setForm({ wpp:"", pass:"", nombre:"", correo:"", ciudad:"", plan:"Pro", status:"active", op:"pending", start_date:"", end_date:"", plan_value:"", airbnb_link:"", country:"USD", meet_enabled:true, precio_base:"", precio_base_fds:"", estrategia:"", estado_precios:"CRITICO" });
      await loadUsers();
    } catch (err) {
      setErr("Error guardando usuario: " + err.message);
    }
  };

  const handleEdit = (wpp, user) => {
    setEditWpp(wpp);
    setForm({
      wpp,
      pass: user.pass,
      nombre: user.name,
      correo: user.correo || "",
      ciudad: user.city,
      plan: user.plan,
      status: user.status,
      op: user.op || "pending",
      start_date: user.start || "",
      end_date: user.end || "",
      plan_value: user.renewal || "",
      airbnb_link: user.airbnb_link || "",
      country: user.country || "USD",
      meet_enabled: user.meetEnabled,
      precio_base: user.precio_base || "",
      precio_base_fds: user.precio_base_fds || "",
      estrategia: user.estrategia || "",
      estado_precios: user.estado_precios || "CRITICO",
    });
    setShowModal(true);
    setErr("");
  };

  const handleDelete = async (wpp) => {
    if (window.confirm(`¿Eliminar a ${users[wpp].name}?`)) {
      try {
        const { error } = await supabase.from("users").delete().eq("wpp", wpp);
        if (error) throw error;
        alert("Usuario eliminado correctamente");
        await loadUsers();
      } catch (err) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  const handleNew = () => {
    setEditWpp(null);
    setForm({ wpp:"", pass:"", nombre:"", correo:"", ciudad:"", plan:"Pro", status:"active" });
    setShowModal(true);
    setErr("");
  };

  const inp = { width:"100%", background:C.white, border:"1px solid "+C.border, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:13, boxSizing:"border-box", outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"'Inter',sans-serif", color:C.text }}>
      <nav style={{ borderBottom:"1px solid "+C.border, padding:"13px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", background:C.white, position:"sticky", top:0, zIndex:100, boxShadow:C.shadow }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Logo size={26}/>
          <div style={{ background:C.yellowBg, border:"1px solid "+C.yellowBorder, borderRadius:100, padding:"3px 10px", fontSize:10, color:C.gold, fontWeight:700, letterSpacing:"0.8px" }}>ADMIN</div>
        </div>
        <button onClick={() => {setSession(null); nav("/login");}} style={{ background:"transparent", border:"1px solid "+C.border, borderRadius:8, padding:"6px 12px", color:C.muted, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Salir</button>
      </nav>
      
      <div style={{ maxWidth:860, margin:"0 auto", padding:"28px 20px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
          {[{l:"Clientes activos",v:active,c:C.green,bg:C.greenBg,br:C.greenBorder},{l:"MRR estimado",v:"$"+mrr.toFixed(0),c:C.primary,bg:C.primaryGlow,br:C.primary+"30"},{l:"Total clientes",v:all.length,c:C.gold,bg:C.yellowBg,br:C.yellowBorder}].map(s=>(
            <div key={s.l} style={{ background:s.bg, border:"1px solid "+s.br, borderRadius:14, padding:"18px 16px", textAlign:"center", boxShadow:C.shadow }}>
              <div style={{ fontSize:26, fontWeight:900, color:s.c, marginBottom:4 }}>{s.v}</div>
              <div style={{ fontSize:11, color:C.muted }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ background:C.white, border:"1px solid "+C.border, borderRadius:16, padding:"20px", boxShadow:C.shadowMd, marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:12, flexWrap:"wrap" }}>
            <h3 style={{ margin:0 }}>Clientes ({all.length})</h3>
            <button onClick={handleNew} style={{ background:"linear-gradient(135deg,"+C.primaryLight+","+C.primary+")", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Nuevo usuario</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12, maxHeight:"500px", overflowY:"auto" }}>
            {all.length === 0 ? (
              <div style={{ textAlign:"center", padding:"20px", color:C.muted, fontSize:13 }}>No hay usuarios. Crea uno para empezar.</div>
            ) : (
              all.map(([wpp,u])=>(
                <div key={wpp} style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:200 }}>
                    <div style={{ fontWeight:700, fontSize:13 }}>{u.name}</div>
                    <div style={{ color:C.muted, fontSize:10, marginTop:2 }}>{wpp} · {u.correo || "sin email"}</div>
                    <div style={{ color:C.muted, fontSize:10, marginTop:2 }}>{u.city} · Plan {u.plan} · {u.status}</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => handleEdit(wpp, u)} style={{ background:C.primaryGlow, border:"1px solid "+C.primary+"40", borderRadius:6, padding:"5px 12px", color:C.primary, fontWeight:600, fontSize:11, cursor:"pointer" }}>✏️ Editar</button>
                    <button onClick={() => handleDelete(wpp)} style={{ background:C.redBg, border:"1px solid "+C.redBorder, borderRadius:6, padding:"5px 12px", color:C.red, fontWeight:600, fontSize:11, cursor:"pointer" }}>🗑️ Eliminar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(4px)" }}>
          <div style={{ background:C.white, border:"1px solid "+C.border, borderRadius:18, maxWidth:420, width:"100%", padding:28, boxShadow:C.shadowLg, position:"relative", maxHeight:"85vh", overflowY:"auto" }}>
            <button onClick={() => setShowModal(false)} style={{ position:"absolute", top:14, right:14, background:"transparent", border:"none", color:C.muted, cursor:"pointer", fontSize:20 }}>✕</button>
            <h2 style={{ fontSize:19, fontWeight:800, marginBottom:16 }}>{editWpp?"Editar usuario":"Crear usuario"}</h2>
            
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:18 }}>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>WHATSAPP</label>
                <input type="text" placeholder="+503 7000 0001" value={form.wpp} onChange={e => setForm(p => ({...p, wpp:e.target.value}))} style={inp} disabled={!!editWpp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>CONTRASEÑA</label>
                <input type="text" placeholder="1234" value={form.pass} onChange={e => setForm(p => ({...p, pass:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>NOMBRE COMPLETO</label>
                <input type="text" placeholder="Juan Pérez" value={form.nombre} onChange={e => setForm(p => ({...p, nombre:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>CORREO</label>
                <input type="email" placeholder="juan@correo.com" value={form.correo} onChange={e => setForm(p => ({...p, correo:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>CIUDAD</label>
                <input type="text" placeholder="San Salvador" value={form.ciudad} onChange={e => setForm(p => ({...p, ciudad:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>PLAN</label>
                <select value={form.plan} onChange={e => setForm(p => ({...p, plan:e.target.value}))} style={inp}>
                  <option>Manual</option>
                  <option>Pro</option>
                  <option>Anual</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>OPTIMIZACIÓN</label>
                <select value={form.op || "pending"} onChange={e => setForm(p => ({...p, op:e.target.value}))} style={inp}>
                  <option value="pending">Pendiente</option>
                  <option value="progress">En curso</option>
                  <option value="done">Finalizada</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>ESTADO</label>
                <select value={form.status} onChange={e => setForm(p => ({...p, status:e.target.value}))} style={inp}>
                  <option value="active">Activo</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>FECHA INICIO</label>
                <input type="date" value={form.start_date} onChange={e => setForm(p => ({...p, start_date:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>FECHA VENCIMIENTO</label>
                <input type="date" value={form.end_date} onChange={e => setForm(p => ({...p, end_date:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>VALOR PLAN (USD)</label>
                <input type="number" placeholder="14.99" value={form.plan_value} onChange={e => setForm(p => ({...p, plan_value:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>LINK AIRBNB</label>
                <input type="url" placeholder="https://airbnb.com/rooms/..." value={form.airbnb_link} onChange={e => setForm(p => ({...p, airbnb_link:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>PAÍS / MONEDA</label>
                <select value={form.country} onChange={e => setForm(p => ({...p, country:e.target.value}))} style={inp}>
                  <option value="USD">USD (Dólares)</option>
                  <option value="GTQ">GTQ (Quetzal)</option>
                  <option value="MXN">MXN (Pesos Mexicanos)</option>
                  <option value="COP">COP (Pesos Colombianos)</option>
                  <option value="BRL">BRL (Real Brasileño)</option>
                  <option value="ARS">ARS (Pesos Argentinos)</option>
                  <option value="CLP">CLP (Pesos Chilenos)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>PRECIO BASE (USD)</label>
                <input type="number" placeholder="49.99" value={form.precio_base} onChange={e => setForm(p => ({...p, precio_base:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>PRECIO BASE FINES DE SEMANA (USD)</label>
                <input type="number" placeholder="74.99" value={form.precio_base_fds} onChange={e => setForm(p => ({...p, precio_base_fds:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>ESTRATEGIA</label>
                <input type="text" placeholder="ej: Incrementar ocupación en temporada baja" value={form.estrategia} onChange={e => setForm(p => ({...p, estrategia:e.target.value}))} style={inp}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:C.muted, display:"block", marginBottom:5, fontWeight:700 }}>ESTADO DE PRECIOS</label>
                <select value={form.estado_precios} onChange={e => setForm(p => ({...p, estado_precios:e.target.value}))} style={inp}>
                  <option value="CRITICO">🔴 CRÍTICO</option>
                  <option value="ESTABLE">🟡 ESTABLE</option>
                  <option value="MEJORAR FOTOS">📸 MEJORAR FOTOS</option>
                  <option value="IDEAL">🟢 IDEAL</option>
                  <option value="ACTIVACION">⚡ ACTIVACIÓN</option>
                  <option value="PERSONALIZADO">⚙️ PERSONALIZADO</option>
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px", background:form.meet_enabled?C.primaryGlow:C.bg, borderRadius:8, border:"1px solid "+(form.meet_enabled?C.primary+"40":C.border), cursor:"pointer" }} onClick={() => setForm(p => ({...p, meet_enabled:!p.meet_enabled}))}>
                <div style={{ width:20, height:20, borderRadius:4, background:form.meet_enabled?C.primary:C.border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {form.meet_enabled && <span style={{ color:"#fff", fontSize:12 }}>✓</span>}
                </div>
                <label style={{ fontSize:11, color:C.text, fontWeight:700, cursor:"pointer", margin:0 }}>¿Tiene reunión de meet?</label>
              </div>
              {err && <div style={{ background:C.redBg, border:"1px solid "+C.redBorder, borderRadius:8, padding:"8px 12px", fontSize:11, color:C.red }}>{err}</div>}
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex:1, background:C.white, border:"1px solid "+C.border, borderRadius:10, padding:"10px 0", fontWeight:600, fontSize:13, cursor:"pointer", color:C.text }}>Cancelar</button>
              <button onClick={handleSave} style={{ flex:1, background:"linear-gradient(135deg,"+C.primaryLight+","+C.primary+")", color:"#fff", border:"none", borderRadius:10, padding:"10px 0", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                {editWpp?"Guardar cambios":"Crear usuario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── APP PAGE (Router) ─────────────────────────────────────────────────────────
function AppPage() {
  const nav = useNavigate();
  const { session, users, loading } = useApp();

  if (loading) {
    return <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontFamily:"'Inter',sans-serif" }}>Cargando...</div>;
  }

  if (!session) {
    return <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontFamily:"'Inter',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <p>Debes iniciar sesión primero</p>
        <button onClick={() => nav("/login")} style={{ marginTop:16, padding:"10px 20px", background:C.primary, color:"#fff", border:"none", borderRadius:8, cursor:"pointer" }}>Ir a Login</button>
      </div>
    </div>;
  }

  if (session.role === "admin") {
    return <AdminDashboard />;
  }

  if (session.role === "user") {
    const user = users[session.wpp];

    if (!user) {
      return <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontFamily:"'Inter',sans-serif" }}>
        <div style={{ textAlign:"center" }}>
          <p>No encontramos tu usuario. Vuelve a iniciar sesión.</p>
          <button onClick={() => nav("/login")} style={{ marginTop:16, padding:"10px 20px", background:C.primary, color:"#fff", border:"none", borderRadius:8, cursor:"pointer" }}>Ir a Login</button>
        </div>
      </div>;
    }

    return <UserDashboard user={user} />;
  }

  return null;
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontSize:18, fontFamily:"'Inter'" }}>404 - Página no encontrada</div>} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
