import { useState } from "react";
import {
  Sprout, Leaf, FlaskConical, CloudRain, Droplets, ScanLeaf,
  Wheat, Menu, X, CheckCircle2, AlertCircle, Loader2
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://dnp123-ag-final.hf.space";

type Result = Record<string, any> | null;

async function getJSON(path: string, params: Record<string, string | number>) {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  );
  const res = await fetch(`${API_URL}${path}?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Request failed");
  return data;
}

async function postJSON(path: string, body: object) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Request failed");
  return data;
}

async function predictDisease(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/predict_disease`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Disease prediction failed");
  return data;
}

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [crop, setCrop] = useState<Result>(null);
  const [fertilizer, setFertilizer] = useState<Result>(null);
  const [yieldResult, setYieldResult] = useState<Result>(null);
  const [disease, setDisease] = useState<Result>(null);
  const [irrigation, setIrrigation] = useState<Result>(null);

  const [soil, setSoil] = useState({
    N: 90, P: 42, K: 43, temperature: 25,
    humidity: 70, ph: 6.5, rainfall: 150
  });
  const [city, setCity] = useState("Delhi");
  const [moisture, setMoisture] = useState(35);
  const [diseaseFile, setDiseaseFile] = useState<File | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError("");
    try { await fn(); }
    catch (e: any) { setError(e.message || "Something went wrong"); }
    finally { setLoading(false); }
  };

  const nav = [
    ["dashboard", "Dashboard", Sprout],
    ["crop", "Crop Advisor", Wheat],
    ["fertilizer", "Fertilizer", FlaskConical],
    ["yield", "Yield", Leaf],
    ["disease", "Disease Scan", ScanLeaf],
    ["irrigation", "Irrigation", Droplets],
  ] as const;

  return (
    <div className="app">
      <aside className={mobileOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="logo"><Sprout size={24} /></div>
          <div><strong>AgriAI</strong><span>Smart Farming</span></div>
          <button className="close mobile" onClick={() => setMobileOpen(false)}><X /></button>
        </div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={active === id ? "nav active" : "nav"}
              onClick={() => { setActive(id); setMobileOpen(false); }}>
              <Icon size={19} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="status-dot"></div>
          <div><b>AI Backend</b><small>Connected to Hugging Face</small></div>
        </div>
      </aside>

      {mobileOpen && <div className="overlay" onClick={() => setMobileOpen(false)} />}

      <main className="main">
        <header>
          <button className="menu mobile" onClick={() => setMobileOpen(true)}><Menu /></button>
          <div>
            <div className="eyebrow">SMART FARMING PLATFORM</div>
            <h1>{nav.find(n => n[0] === active)?.[1]}</h1>
          </div>
          <div className="api-pill"><span></span> API Online</div>
        </header>

        {error && <div className="error"><AlertCircle size={18}/><span>{error}</span></div>}

        {active === "dashboard" && (
          <section>
            <div className="hero">
              <div>
                <span className="tag">🌱 AI-POWERED AGRICULTURE</span>
                <h2>Make better farming decisions<br/>with <em>AgriAI.</em></h2>
                <p>Predict crops, estimate yield, detect leaf diseases, optimize fertilizer and manage irrigation from one place.</p>
                <button className="primary" onClick={() => setActive("crop")}>Start Crop Analysis →</button>
              </div>
              <div className="hero-art"><Sprout size={120} strokeWidth={1}/></div>
            </div>
            <div className="cards">
              <Feature icon={Wheat} title="Crop Advisor" text="Find a suitable crop from soil and weather conditions." onClick={() => setActive("crop")} />
              <Feature icon={ScanLeaf} title="Disease Scan" text="Upload a leaf image and get AI-based disease information." onClick={() => setActive("disease")} />
              <Feature icon={Droplets} title="Smart Irrigation" text="Use soil moisture and city weather to decide pump status." onClick={() => setActive("irrigation")} />
              <Feature icon={FlaskConical} title="Fertilizer" text="Get a fertilizer recommendation from N, P, K and pH." onClick={() => setActive("fertilizer")} />
            </div>
          </section>
        )}

        {active === "crop" && <CropAdvisor soil={soil} setSoil={setSoil} loading={loading} result={crop}
          onRun={() => run(async () => setCrop(await getJSON("/predict_crop", soil)))} />}
        {active === "fertilizer" && <Fertilizer soil={soil} setSoil={setSoil} loading={loading} result={fertilizer}
          onRun={() => run(async () => setFertilizer(await getJSON("/fertilizer", {N: soil.N, P: soil.P, K: soil.K, ph: soil.ph})))} />}
        {active === "yield" && <Yield soil={soil} setSoil={setSoil} loading={loading} result={yieldResult}
          onRun={() => run(async () => setYieldResult(await getJSON("/predict_yield", {temperature: soil.temperature, rainfall: soil.rainfall, ph: soil.ph, N: soil.N, P: soil.P, K: soil.K})))} />}
        {active === "disease" && <Disease file={diseaseFile} setFile={setDiseaseFile} loading={loading} result={disease}
          onRun={() => diseaseFile ? run(async () => setDisease(await predictDisease(diseaseFile))) : setError("Please select a leaf image first.")} />}
        {active === "irrigation" && <Irrigation city={city} setCity={setCity} moisture={moisture} setMoisture={setMoisture}
          loading={loading} result={irrigation} onRun={() => run(async () => setIrrigation(await postJSON("/irrigation_ai", {moisture, ph: soil.ph, city})))} />}
      </main>
    </div>
  );
}

function Feature({icon: Icon, title, text, onClick}: any) {
  return <button className="feature" onClick={onClick}><div className="feature-icon"><Icon/></div><div><b>{title}</b><p>{text}</p></div><span>→</span></button>;
}

function NumberField({label, value, onChange}: any) {
  return <label className="field"><span>{label}</span><input type="number" value={value} onChange={e => onChange(Number(e.target.value))}/></label>;
}

function SoilGrid({soil, setSoil}: any) {
  const fields = [
    ["Nitrogen (N)", "N"], ["Phosphorus (P)", "P"], ["Potassium (K)", "K"],
    ["Temperature °C", "temperature"], ["Humidity %", "humidity"], ["pH", "ph"], ["Rainfall mm", "rainfall"]
  ];
  return <div className="grid-fields">{fields.map(([label,key]) => <NumberField key={key} label={label} value={soil[key]} onChange={(v:number) => setSoil({...soil,[key]:v})}/>)}</div>;
}

function Panel({title, icon: Icon, children, result, loading, onRun, button}: any) {
  return <section className="panel"><div className="panel-title"><div className="feature-icon"><Icon/></div><div><h2>{title}</h2><p>Enter your farm data below.</p></div></div>{children}<button className="primary wide" disabled={loading} onClick={onRun}>{loading ? <><Loader2 className="spin"/> Processing...</> : button}</button>{result && <div className="result"><CheckCircle2/><div><b>AI Result</b><pre>{JSON.stringify(result, null, 2)}</pre></div></div>}</section>;
}

function CropAdvisor({soil,setSoil,loading,result,onRun}: any) {
  return <Panel title="Crop Advisor" icon={Wheat} loading={loading} result={result} onRun={onRun} button="Predict Best Crop"><SoilGrid soil={soil} setSoil={setSoil}/></Panel>;
}
function Fertilizer({soil,setSoil,loading,result,onRun}: any) {
  return <Panel title="Fertilizer Recommendation" icon={FlaskConical} loading={loading} result={result} onRun={onRun} button="Recommend Fertilizer"><div className="grid-fields"><NumberField label="Nitrogen (N)" value={soil.N} onChange={(v:number)=>setSoil({...soil,N:v})}/><NumberField label="Phosphorus (P)" value={soil.P} onChange={(v:number)=>setSoil({...soil,P:v})}/><NumberField label="Potassium (K)" value={soil.K} onChange={(v:number)=>setSoil({...soil,K:v})}/><NumberField label="pH" value={soil.ph} onChange={(v:number)=>setSoil({...soil,ph:v})}/></div></Panel>;
}
function Yield({soil,setSoil,loading,result,onRun}: any) {
  return <Panel title="Yield Prediction" icon={Leaf} loading={loading} result={result} onRun={onRun} button="Predict Yield"><div className="grid-fields"><NumberField label="Temperature °C" value={soil.temperature} onChange={(v:number)=>setSoil({...soil,temperature:v})}/><NumberField label="Rainfall mm" value={soil.rainfall} onChange={(v:number)=>setSoil({...soil,rainfall:v})}/><NumberField label="pH" value={soil.ph} onChange={(v:number)=>setSoil({...soil,ph:v})}/><NumberField label="Nitrogen (N)" value={soil.N} onChange={(v:number)=>setSoil({...soil,N:v})}/><NumberField label="Phosphorus (P)" value={soil.P} onChange={(v:number)=>setSoil({...soil,P:v})}/><NumberField label="Potassium (K)" value={soil.K} onChange={(v:number)=>setSoil({...soil,K:v})}/></div></Panel>;
}
function Disease({file,setFile,loading,result,onRun}: any) {
  return <Panel title="Leaf Disease Scanner" icon={ScanLeaf} loading={loading} result={result} onRun={onRun} button="Analyze Leaf"><label className="upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/><ScanLeaf size={42}/><b>{file ? file.name : "Choose a leaf image"}</b><span>JPG, PNG or WEBP</span></label>{result && <div className="disease-card"><strong>{result.name}</strong><span>Confidence: {formatConfidence(result.confidence)}</span><span>{result.severity || ""}</span></div>}</Panel>;
}
function Irrigation({city,setCity,moisture,setMoisture,loading,result,onRun}: any) {
  return <Panel title="Smart Irrigation" icon={Droplets} loading={loading} result={result} onRun={onRun} button="Check Irrigation"><div className="grid-fields"><label className="field"><span>City</span><input value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Delhi"/></label><NumberField label="Soil Moisture %" value={moisture} onChange={setMoisture}/></div>{result?.pump && <div className={result.pump==="ON" ? "pump on" : "pump"}><Droplets/><div><b>Pump: {result.pump}</b><p>{result.reason}</p></div></div>}</Panel>;
}
function formatConfidence(v:any) {
  let n = Number(v);
  if (!Number.isFinite(n)) return "0.00%";
  if (n > 0 && n <= 1) n *= 100;
  if (n > 100) n /= 100;
  n = Math.max(0, Math.min(100, n));
  return `${n.toFixed(2)}%`;
}

export default App;
