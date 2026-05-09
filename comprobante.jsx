import { useState, useRef, useEffect } from "react";

const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return "$0.00";
  return num.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
};

const today = () => new Date().toISOString().split("T")[0];

const toLetras = (n) => {
  if (!n || isNaN(n)) return "CERO PESOS 00/100 M.N.";
  const entero = Math.floor(n);
  const centavos = Math.round((n - entero) * 100);
  const unidades = ["","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve","veinte","veintiuno","veintidós","veintitrés","veinticuatro","veinticinco","veintiséis","veintisiete","veintiocho","veintinueve"];
  const decenas = ["","","veinte","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"];
  const centenas = ["","cien","doscientos","trescientos","cuatrocientos","quinientos","seiscientos","setecientos","ochocientos","novecientos"];
  const conv = (num) => {
    if (num === 0) return "";
    if (num < 30) return unidades[num];
    if (num < 100) { const d=Math.floor(num/10),u=num%10; return u===0?decenas[d]:decenas[d]+" y "+unidades[u]; }
    if (num < 1000) { const c=Math.floor(num/100),r=num%100; return (c===1&&r===0)?"cien":centenas[c]+(r>0?" "+conv(r):""); }
    if (num < 1000000) { const m=Math.floor(num/1000),r=num%1000; return (m===1?"mil":conv(m)+" mil")+(r>0?" "+conv(r):""); }
    return num.toString();
  };
  return `${(conv(entero)||"cero").toUpperCase()} PESOS ${String(centavos).padStart(2,"0")}/100 M.N.`;
};

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
    document.head.appendChild(s);
  });

const UNITS = ["Global","m²","m³","ml","Pieza","Día","Jornal","Lote"];

export default function Comprobante() {
  const [folio, setFolio]         = useState("001");
  const [fecha, setFecha]         = useState(today());
  const [prestador, setPrestador] = useState({ nombre:"", telefono:"", direccion:"" });
  const [cliente, setCliente]     = useState({ nombre:"", telefono:"", direccionObra:"" });
  const [partidas, setPartidas]   = useState([{ id:1, concepto:"", unidad:"Global", cantidad:1, precioUnitario:"" }]);
  const [pago, setPago]           = useState("Efectivo");
  const [anticipos, setAnticipos] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [tab, setTab]             = useState("form");
  const [libsReady, setLibsReady] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError]   = useState(null);
  const receiptRef = useRef();

  useEffect(() => {
    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
    ]).then(() => setLibsReady(true))
      .catch((e) => setPdfError(e.message));
  }, []);

  const total = partidas.reduce((acc, p) => {
    const s = parseFloat(p.cantidad||0) * parseFloat(p.precioUnitario||0);
    return acc + (isNaN(s) ? 0 : s);
  }, 0);
  const anticipoNum = parseFloat(anticipos) || 0;
  const saldo = total - anticipoNum;

  const addPartida    = () => setPartidas(prev => [...prev, { id:Date.now(), concepto:"", unidad:"Global", cantidad:1, precioUnitario:"" }]);
  const removePartida = (id) => setPartidas(prev => prev.filter(p => p.id !== id));
  const updatePartida = (id, field, value) => setPartidas(prev => prev.map(p => p.id===id ? {...p,[field]:value} : p));

  const fechaDisplay = fecha
    ? new Date(fecha+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"})
    : "—";

  const generatePDF = async () => {
    if (!libsReady) return;
    setTab("preview");
    setPdfLoading(true);
    setPdfError(null);
    await new Promise(r => setTimeout(r, 400));
    try {
      const el = receiptRef.current;
      if (!el) throw new Error("No se encontró el elemento del recibo");
      const canvas = await window.html2canvas(el, { scale:2, useCORS:true, backgroundColor:"#ffffff", logging:false });
      const imgData = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const iw = pw;
      const ih = (canvas.height * pw) / canvas.width;
      if (ih <= ph) {
        pdf.addImage(imgData, "PNG", 0, 0, iw, ih);
      } else {
        let yo = 0;
        while (yo < ih) {
          if (yo > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -yo, iw, ih);
          yo += ph;
        }
      }
      pdf.save(`Comprobante-Albanileria-${folio}-${fecha}.pdf`);
    } catch(e) {
      setPdfError(`Error al generar PDF: ${e.message}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const PdfBtn = ({ style={} }) => (
    <button
      style={{ border:"none", padding:"10px 22px", borderRadius:3, cursor: libsReady&&!pdfLoading?"pointer":"not-allowed",
        fontFamily:"'Source Sans 3',sans-serif", fontSize:".85rem", letterSpacing:".05em", textTransform:"uppercase",
        display:"inline-flex", alignItems:"center", gap:7, background:"#8b6914", color:"#fff",
        opacity: libsReady&&!pdfLoading ? 1 : 0.55, transition:"all .2s", ...style }}
      onClick={generatePDF}
      disabled={!libsReady || pdfLoading}
    >
      {pdfLoading ? <><Spinner /> Generando…</> : !libsReady ? "⏳ Cargando…" : "⬇️ Descargar PDF"}
    </button>
  );

  return (
    <div style={{ fontFamily:"sans-serif", minHeight:"100vh", background:"#f0ece4" }}>
      <style>{css}</style>
      <div className="app">

        {/* Header */}
        <div className="hbar">
          <div>
            <h1>Comprobante de Servicios</h1>
            <p>Trabajos de Albañilería y Construcción · Documento no fiscal</p>
          </div>
          <div className="hbar-actions">
            <button className="btn btn-outline" onClick={() => { setTab("preview"); setTimeout(()=>window.print(),300); }}>
              🖨️ Imprimir
            </button>
            <PdfBtn />
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tbtn ${tab==="form"?"active":""}`} onClick={() => setTab("form")}>✏️ Captura</button>
          <button className={`tbtn ${tab==="preview"?"active":""}`} onClick={() => setTab("preview")}>👁️ Vista previa</button>
        </div>

        {/* ── FORM ── */}
        {tab === "form" && (
          <div className="farea">

            <div className="section">
              <div className="stitle">Datos del comprobante</div>
              <div className="g3">
                <Field label="Folio / Número"><input value={folio} onChange={e=>setFolio(e.target.value)} placeholder="001"/></Field>
                <Field label="Fecha de emisión"><input type="date" value={fecha} onChange={e=>setFecha(e.target.value)}/></Field>
                <Field label="Forma de pago">
                  <select value={pago} onChange={e=>setPago(e.target.value)}>
                    {["Efectivo","Transferencia bancaria","Cheque","Mixto"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            <div className="section">
              <div className="stitle">Prestador del servicio</div>
              <div className="g2">
                <Field label="Nombre completo"><input value={prestador.nombre} onChange={e=>setPrestador({...prestador,nombre:e.target.value})} placeholder="Juan Pérez González"/></Field>
                <Field label="Teléfono"><input value={prestador.telefono} onChange={e=>setPrestador({...prestador,telefono:e.target.value})} placeholder="55 1234 5678"/></Field>
              </div>
              <div style={{marginTop:12}}>
                <Field label="Domicilio (opcional)"><input value={prestador.direccion} onChange={e=>setPrestador({...prestador,direccion:e.target.value})} placeholder="Calle, colonia, municipio"/></Field>
              </div>
            </div>

            <div className="section">
              <div className="stitle">Cliente / Contratante</div>
              <div className="g2">
                <Field label="Nombre completo"><input value={cliente.nombre} onChange={e=>setCliente({...cliente,nombre:e.target.value})} placeholder="María López Hernández"/></Field>
                <Field label="Teléfono"><input value={cliente.telefono} onChange={e=>setCliente({...cliente,telefono:e.target.value})} placeholder="55 9876 5432"/></Field>
              </div>
              <div style={{marginTop:12}}>
                <Field label="Dirección de la obra"><input value={cliente.direccionObra} onChange={e=>setCliente({...cliente,direccionObra:e.target.value})} placeholder="Calle, número, colonia, municipio, estado"/></Field>
              </div>
            </div>

            <div className="section">
              <div className="stitle">Descripción de trabajos y materiales</div>
              <div className="prow-header">
                <label>Concepto / Descripción</label>
                <label>Unidad</label>
                <label>Cant.</label>
                <label>Precio unit.</label>
                <span/>
              </div>
              {partidas.map(p => (
                <div className="prow" key={p.id}>
                  <input value={p.concepto} onChange={e=>updatePartida(p.id,"concepto",e.target.value)} placeholder="Ej: Colado de losa, aplanado de muros…"/>
                  <select value={p.unidad} onChange={e=>updatePartida(p.id,"unidad",e.target.value)}>
                    {UNITS.map(u=><option key={u}>{u}</option>)}
                  </select>
                  <input type="number" min="0" value={p.cantidad} onChange={e=>updatePartida(p.id,"cantidad",e.target.value)}/>
                  <input type="number" min="0" value={p.precioUnitario} onChange={e=>updatePartida(p.id,"precioUnitario",e.target.value)} placeholder="0.00"/>
                  <button className="btn-rm" onClick={()=>removePartida(p.id)}>×</button>
                </div>
              ))}
              <button className="btn-add" onClick={addPartida}>+ Agregar concepto</button>

              <div className="totals">
                <div className="tline"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
                <div className="tline" style={{gap:10}}>
                  <span>Anticipo(s) recibido(s)</span>
                  <input type="number" min="0" value={anticipos} onChange={e=>setAnticipos(e.target.value)}
                    style={{width:110,textAlign:"right",padding:"4px 8px"}} placeholder="0.00"/>
                </div>
                <div className="tline grand"><span>SALDO A PAGAR</span><span>{formatCurrency(saldo)}</span></div>
              </div>
            </div>

            <div className="section">
              <div className="stitle">Observaciones</div>
              <textarea value={observaciones} onChange={e=>setObservaciones(e.target.value)}
                placeholder="Garantía de los trabajos, condiciones especiales, materiales incluidos/excluidos, etc."/>
            </div>

            {pdfError && <div className="err">⚠️ {pdfError}</div>}

            <div style={{display:"flex",gap:10,marginBottom:32,flexWrap:"wrap"}}>
              <button className="btn btn-dark" onClick={()=>setTab("preview")}>👁️ Ver comprobante</button>
              <PdfBtn/>
            </div>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {tab === "preview" && (
          <div className="parea">
            <div className="parea-actions">
              <button className="btn btn-dark" onClick={()=>setTab("form")}>✏️ Editar</button>
              <button className="btn btn-dark" onClick={()=>setTimeout(()=>window.print(),100)}>🖨️ Imprimir</button>
              <PdfBtn/>
              {pdfError && <span className="err" style={{margin:0}}>⚠️ {pdfError}</span>}
            </div>

            {/* Recibo — capturado por html2canvas */}
            <div className="receipt" ref={receiptRef}>
              <div className="rhead">
                <div className="stamp">Comprobante de Servicios Profesionales</div>
                <h2>Trabajos de Albañilería<br/>y Construcción</h2>
                <div className="rsub">Documento no fiscal · Válido como comprobante de gasto</div>
              </div>

              <div className="folio-fecha">
                <div><strong>Folio</strong>{folio||"—"}</div>
                <div><strong>Fecha</strong>{fechaDisplay}</div>
              </div>

              <div className="parties">
                <div className="pbox">
                  <div className="role">Prestador del Servicio</div>
                  <div className="pname">{prestador.nombre||"—"}</div>
                  {prestador.telefono  && <div className="detail">Tel: {prestador.telefono}</div>}
                  {prestador.direccion && <div className="detail">{prestador.direccion}</div>}
                </div>
                <div className="pbox">
                  <div className="role">Cliente / Contratante</div>
                  <div className="pname">{cliente.nombre||"—"}</div>
                  {cliente.telefono      && <div className="detail">Tel: {cliente.telefono}</div>}
                  {cliente.direccionObra && <div className="detail">Obra: {cliente.direccionObra}</div>}
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Concepto / Descripción</th><th>Unidad</th>
                    <th>Cant.</th><th>Precio unit.</th><th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {partidas.filter(p=>p.concepto).map((p,i)=>{
                    const sub = parseFloat(p.cantidad||0)*parseFloat(p.precioUnitario||0);
                    return (
                      <tr key={p.id}>
                        <td>{i+1}</td><td>{p.concepto}</td><td>{p.unidad}</td>
                        <td>{p.cantidad}</td><td>{formatCurrency(p.precioUnitario)}</td>
                        <td>{formatCurrency(isNaN(sub)?0:sub)}</td>
                      </tr>
                    );
                  })}
                  {!partidas.some(p=>p.concepto) && (
                    <tr><td colSpan={6} style={{textAlign:"center",color:"#aaa",padding:20}}>Sin conceptos capturados</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{textAlign:"right",color:"#666"}}>Subtotal</td>
                    <td>{formatCurrency(total)}</td>
                  </tr>
                  {anticipoNum>0 && (
                    <tr>
                      <td colSpan={5} style={{textAlign:"right",color:"#666"}}>Anticipo(s) recibido(s)</td>
                      <td style={{color:"#2e7d32"}}>− {formatCurrency(anticipoNum)}</td>
                    </tr>
                  )}
                  <tr className="gtotal">
                    <td colSpan={5} style={{textAlign:"right"}}>TOTAL A PAGAR</td>
                    <td>{formatCurrency(saldo)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="en-letras">Son: {toLetras(saldo)}</div>

              <div className="po">
                <div className="ibox">
                  <div className="ilabel">Forma de pago</div>
                  <div className="ival">{pago}</div>
                </div>
                {observaciones && (
                  <div className="ibox">
                    <div className="ilabel">Observaciones</div>
                    <div className="ival">{observaciones}</div>
                  </div>
                )}
              </div>

              <div className="sigs">
                <div className="sigline"><strong>Firma del Prestador</strong>{prestador.nombre||"Nombre del prestador"}</div>
                <div className="sigline"><strong>Firma de Conformidad del Cliente</strong>{cliente.nombre||"Nombre del cliente"}</div>
              </div>

              <div className="legal">
                Este documento es un comprobante de servicios de carácter privado entre las partes. No sustituye a una factura fiscal (CFDI).<br/>
                Ambas firmas dan fe de la prestación del servicio y el pago acordado. Folio {folio} · {fechaDisplay}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers de UI ─────────────────────────────────────────────────────────── */

const Field = ({ label, children }) => (
  <div>
    <label>{label}</label>
    {children}
  </div>
);

const Spinner = () => (
  <div style={{
    width:14, height:14, border:"2px solid rgba(255,255,255,.3)",
    borderTopColor:"#fff", borderRadius:"50%",
    animation:"spin .7s linear infinite", flexShrink:0,
  }}/>
);

/* ── CSS ─────────────────────────────────────────────────────────────────── */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+3:wght@300;400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
@keyframes spin{to{transform:rotate(360deg)}}
.app{font-family:'Source Sans 3',sans-serif}

.hbar{background:#1a1a2e;color:#e8d5b0;padding:16px 28px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.hbar h1{font-family:'Playfair Display',serif;font-size:1.2rem;letter-spacing:.03em}
.hbar p{font-size:.75rem;opacity:.6;margin-top:2px}
.hbar-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}

.tabs{display:flex;background:#2d2d44}
.tbtn{padding:10px 24px;border:none;cursor:pointer;font-family:'Source Sans 3',sans-serif;font-size:.85rem;letter-spacing:.05em;text-transform:uppercase;transition:all .2s}
.tbtn.active{background:#e8d5b0;color:#1a1a2e;font-weight:600}
.tbtn:not(.active){background:transparent;color:#a0a0c0}
.tbtn:not(.active):hover{background:#383860;color:#e8d5b0}

.btn{border:none;padding:10px 22px;border-radius:3px;cursor:pointer;font-family:'Source Sans 3',sans-serif;font-size:.85rem;letter-spacing:.05em;text-transform:uppercase;display:inline-flex;align-items:center;gap:7px;transition:all .2s}
.btn-dark{background:#1a1a2e;color:#e8d5b0}.btn-dark:hover{background:#2d2d44}
.btn-outline{background:transparent;border:1.5px solid #e8d5b0;color:#e8d5b0}.btn-outline:hover{background:rgba(232,213,176,.15)}

.farea{padding:24px 28px;max-width:860px;margin:0 auto}
.section{background:#fff;border-radius:4px;padding:20px 22px;margin-bottom:18px;border-left:4px solid #8b6914;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.stitle{font-family:'Playfair Display',serif;font-size:.95rem;color:#1a1a2e;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #e8d5b0}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
label{display:block;font-size:.72rem;color:#666;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
input,select,textarea{width:100%;padding:8px 11px;border:1px solid #d4c8a8;border-radius:3px;font-family:'Source Sans 3',sans-serif;font-size:.9rem;color:#1a1a2e;background:#fdfaf4;transition:border .2s}
input:focus,select:focus,textarea:focus{outline:none;border-color:#8b6914}
textarea{resize:vertical;min-height:68px}

.prow-header{display:grid;grid-template-columns:2fr 1fr 72px 115px 32px;gap:7px;margin-bottom:6px}
.prow{display:grid;grid-template-columns:2fr 1fr 72px 115px 32px;gap:7px;align-items:center;margin-bottom:7px}
.btn-add{background:none;border:1.5px dashed #8b6914;color:#8b6914;padding:7px 14px;border-radius:3px;cursor:pointer;font-size:.82rem;font-family:'Source Sans 3',sans-serif;margin-top:4px}
.btn-add:hover{background:#fdf5e0}
.btn-rm{background:none;border:none;color:#c0392b;cursor:pointer;font-size:1.1rem}
.totals{display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-top:14px}
.tline{display:flex;gap:20px;align-items:center;font-size:.88rem;color:#444}
.tline.grand{font-size:1rem;font-weight:700;color:#1a1a2e;border-top:2px solid #8b6914;padding-top:8px}
.tline span:last-child{min-width:110px;text-align:right}
.err{background:#fff0f0;border:1px solid #e0b4b4;border-radius:3px;padding:8px 14px;font-size:.82rem;color:#c0392b;margin-top:8px}

.parea{padding:20px 28px;max-width:820px;margin:0 auto}
.parea-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;align-items:center}

/* Receipt */
.receipt{background:#fff;border:1px solid #d4c8a8;padding:36px 44px;box-shadow:0 2px 16px rgba(0,0,0,.1);position:relative}
.receipt::before{content:'';position:absolute;top:8px;left:8px;right:8px;bottom:8px;border:1px solid #e8d5b0;pointer-events:none}
.rhead{text-align:center;margin-bottom:26px}
.stamp{font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:#8b6914;margin-bottom:6px}
.rhead h2{font-family:'Playfair Display',serif;font-size:1.7rem;color:#1a1a2e;line-height:1.2}
.rsub{font-size:.8rem;color:#888;margin-top:4px;letter-spacing:.04em}
.folio-fecha{display:flex;justify-content:space-between;margin-bottom:22px;font-size:.84rem}
.folio-fecha>div{background:#fdfaf4;border:1px solid #e8d5b0;padding:6px 14px;border-radius:2px}
.folio-fecha strong{font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:#8b6914;display:block}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px}
.pbox{border:1px solid #e8d5b0;padding:13px 15px;border-radius:2px;background:#fdfaf4}
.role{font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:#8b6914;margin-bottom:5px}
.pname{font-family:'Playfair Display',serif;font-size:.95rem;color:#1a1a2e}
.detail{font-size:.8rem;color:#555;margin-top:3px}
.receipt table{width:100%;border-collapse:collapse;font-size:.83rem;margin-bottom:18px}
.receipt table thead tr{background:#1a1a2e;color:#e8d5b0}
.receipt table thead th{padding:7px 10px;text-align:left;font-size:.68rem;text-transform:uppercase;letter-spacing:.07em;font-weight:600}
.receipt table thead th:last-child,.receipt table tbody td:last-child,.receipt table tfoot td:last-child{text-align:right}
.receipt table tbody tr:nth-child(even){background:#fdfaf4}
.receipt table tbody td{padding:8px 10px;border-bottom:1px solid #ede7d6;color:#333}
.receipt table tfoot td{padding:6px 10px;font-size:.84rem}
.receipt table tfoot .gtotal td{font-family:'Playfair Display',serif;font-size:.95rem;background:#1a1a2e;color:#e8d5b0;padding:9px 10px}
.en-letras{font-size:.76rem;color:#666;font-style:italic;margin-bottom:18px;padding:7px 13px;border-left:3px solid #e8d5b0;background:#fdfaf4}
.po{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:26px}
.ilabel{font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;color:#8b6914;margin-bottom:3px}
.ival{font-size:.82rem;color:#333}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:32px}
.sigline{border-top:1px solid #333;padding-top:8px;text-align:center;font-size:.76rem;color:#555}
.sigline strong{display:block;font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;color:#8b6914;margin-bottom:50px}
.legal{text-align:center;font-size:.65rem;color:#aaa;margin-top:22px;letter-spacing:.03em;border-top:1px dashed #ddd;padding-top:13px}

@media print{
  .hbar,.tabs,.farea,.parea-actions{display:none!important}
  .parea{padding:0;max-width:100%}
  .receipt{box-shadow:none;border:1px solid #ccc;padding:24px 32px}
  body{background:#fff}
}
@media(max-width:600px){
  .farea,.parea{padding:14px}
  .g2,.g3,.parties,.po,.sigs{grid-template-columns:1fr}
  .prow,.prow-header{grid-template-columns:1fr 80px 30px}
  .prow>select,.prow>input:nth-child(3),.prow-header label:nth-child(2),.prow-header label:nth-child(3){display:none}
  .folio-fecha{flex-direction:column;gap:8px}
}
`;
