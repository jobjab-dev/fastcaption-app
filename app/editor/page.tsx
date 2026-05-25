"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocale } from "@/app/components/LocaleProvider";
import { Cap, FontStyle, FONTS, LANGS, fmt, DEFAULT_FONT, transcribeVideo, exportAssFile } from "./editor-helpers";

export default function EditorPage() {
  const { t } = useLocale();
  const vRef = useRef<HTMLVideoElement>(null);
  const tlRef = useRef<HTMLDivElement>(null);
  const vidIn = useRef<HTMLInputElement>(null);
  const [vUrl, setVUrl] = useState<string|null>(null);
  const [vFile, setVFile] = useState<File|null>(null);
  const [ct, setCt] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [caps, setCaps] = useState<Cap[]>([]);
  const [aIdx, setAIdx] = useState(-1);
  const [lang, setLang] = useState("th");
  const [assMode, setAssMode] = useState<"pause"|"word">("pause");
  const [orient, setOrient] = useState<"portrait"|"landscape">("portrait");
  const [maxCh, setMaxCh] = useState(16);
  const [font, setFont] = useState<FontStyle>(DEFAULT_FONT);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragVid, setDragVid] = useState(false);
  // Timeline drag state
  const [dragCap, setDragCap] = useState<{id:number;type:"move"|"left"|"right";startX:number;origStart:number;origEnd:number}|null>(null);

  const loadVid = useCallback((f: File) => { if(vUrl) URL.revokeObjectURL(vUrl); setVFile(f); setVUrl(URL.createObjectURL(f)); }, [vUrl]);

  useEffect(() => { const v=vRef.current; if(!v) return; const a=()=>setCt(v.currentTime); const b=()=>setDur(v.duration); const c=()=>setPlaying(true); const d=()=>setPlaying(false); v.addEventListener("timeupdate",a); v.addEventListener("loadedmetadata",b); v.addEventListener("play",c); v.addEventListener("pause",d); return()=>{v.removeEventListener("timeupdate",a);v.removeEventListener("loadedmetadata",b);v.removeEventListener("play",c);v.removeEventListener("pause",d);}; }, [vUrl]);
  useEffect(() => { setAIdx(caps.findIndex(c => ct>=c.start && ct<=c.end)); }, [ct, caps]);

  // Transcribe — upload video directly (Replicate Whisper handles video URLs)
  const doTranscribe = async () => {
    if(!vFile) return; setBusy(true); setStatus("Starting...");
    try {
      // Rename to ASCII to avoid URL encoding issues with Thai filenames
      const ext = vFile.name.split(".").pop() || "mp4";
      const safeFile = new File([vFile], `video_${Date.now()}.${ext}`, { type: vFile.type });
      const c = await transcribeVideo(safeFile, lang, setStatus);
      setCaps(c); setStatus(`✓ ${c.length} captions`);
    } catch(e) { setStatus(`Error: ${e}`); } finally { setBusy(false); }
  };

  // Export ASS from current captions
  const doExportAss = async () => {
    if(!caps.length) return; setBusy(true); setStatus("Generating ASS...");
    try {
      const json = JSON.stringify({ segments: caps.map(c=>({start:c.start,end:c.end,text:c.text})) });
      const blob = new File([json], "captions.json", { type: "application/json" });
      const result = await exportAssFile(blob, assMode, orient, lang, maxCh, font);
      const a = document.createElement("a"); a.href = URL.createObjectURL(result);
      a.download = `${vFile?.name.replace(/\.[^.]+$/,"") || "subtitle"}.ass`; a.click();
      setStatus("ASS exported ✓");
    } catch(e) { setStatus(`Error: ${e}`); } finally { setBusy(false); }
  };

  // Export Video
  const doExportVid = async () => {
    const v=vRef.current; if(!v||!caps.length) return; setBusy(true); setStatus("Exporting video...");
    const cnv=document.createElement("canvas"); cnv.width=v.videoWidth||1280; cnv.height=v.videoHeight||720;
    const ctx=cnv.getContext("2d")!;
    const vs=(v as HTMLVideoElement&{captureStream:(fps?:number)=>MediaStream}).captureStream();
    const cs=cnv.captureStream(30);
    const combined=new MediaStream([...cs.getVideoTracks(),...vs.getAudioTracks()]);
    const chunks:Blob[]=[]; const mt=MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")?"video/webm;codecs=vp9,opus":"video/webm";
    const rec=new MediaRecorder(combined,{mimeType:mt,videoBitsPerSecond:5e6});
    rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    rec.onstop=()=>{ const b=new Blob(chunks,{type:mt}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`${vFile?.name.replace(/\.[^.]+$/,"")||"video"}_sub.webm`; a.click(); setBusy(false); setStatus("Video exported ✓"); };
    v.currentTime=0; v.muted=true; await new Promise<void>(r=>{v.onseeked=()=>r();}); rec.start(); v.play();
    const draw=()=>{ if(v.ended||v.paused){rec.stop();v.muted=false;return;} ctx.drawImage(v,0,0,cnv.width,cnv.height); const c=caps.find(c=>v.currentTime>=c.start&&v.currentTime<=c.end); if(c){ const fs=Math.round(cnv.height*font.fontSize/1920); ctx.font=`${font.bold?"bold ":""}${font.italic?"italic ":""}${fs}px "${font.fontName}"`; ctx.textAlign="center"; ctx.textBaseline="bottom"; const x=cnv.width/2,y=cnv.height-Math.round(cnv.height*.07); ctx.strokeStyle=font.outline; ctx.lineWidth=font.outlineW*2; ctx.lineJoin="round"; ctx.strokeText(c.text,x,y); ctx.fillStyle=font.color; ctx.fillText(c.text,x,y); } setStatus(`Exporting ${Math.round(v.currentTime/dur*100)}%`); requestAnimationFrame(draw); };
    requestAnimationFrame(draw);
  };

  // Timeline seek
  const seekTl = (e: React.MouseEvent) => { if(!tlRef.current||!vRef.current||!dur) return; const r=tlRef.current.getBoundingClientRect(); vRef.current.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*dur; };

  // Timeline drag handlers for caption blocks
  const pxToTime = (px: number) => { if(!tlRef.current||!dur) return 0; return (px/tlRef.current.getBoundingClientRect().width)*dur; };
  const onCapMouseDown = (e: React.MouseEvent, cap: Cap, type: "move"|"left"|"right") => { e.stopPropagation(); e.preventDefault(); setDragCap({id:cap.id,type,startX:e.clientX,origStart:cap.start,origEnd:cap.end}); };

  useEffect(() => {
    if(!dragCap) return;
    const onMove = (e: MouseEvent) => {
      const dx = pxToTime(e.clientX - dragCap.startX);
      setCaps(prev => prev.map(c => {
        if(c.id !== dragCap.id) return c;
        if(dragCap.type === "move") { const d=dragCap.origEnd-dragCap.origStart; const s=Math.max(0,dragCap.origStart+dx); return {...c,start:s,end:s+d}; }
        if(dragCap.type === "left") return {...c,start:Math.max(0,Math.min(dragCap.origStart+dx,c.end-.1))};
        return {...c,end:Math.max(c.start+.1,dragCap.origEnd+dx)};
      }));
    };
    const onUp = () => setDragCap(null);
    window.addEventListener("mousemove",onMove); window.addEventListener("mouseup",onUp);
    return () => { window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
  }, [dragCap]);

  const aCap = aIdx >= 0 ? caps[aIdx] : null;

  return (
    <div style={{height:"calc(100vh - 56px)",background:"#0d0d0f",fontFamily:"'Inter',sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Kanit:wght@400;700&display=swap');
        .eb{cursor:pointer;transition:all .15s;border:1px solid rgba(255,255,255,.1);border-radius:6px;background:rgba(255,255,255,.06);color:#e5e5e5;padding:6px 10px;font-size:.78rem}.eb:hover{background:rgba(249,115,22,.15);border-color:rgba(249,115,22,.4)}
        .ep{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;font-weight:600}.ep:hover{background:linear-gradient(135deg,#fb923c,#f97316)}.ep:disabled{opacity:.5;cursor:not-allowed}
        .es{background:rgba(255,255,255,.06);color:#e5e5e5;border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:5px 7px;font-size:.78rem;width:100%}.es:focus{outline:1px solid #f97316}
        .el{font-size:.68rem;color:#888;margin-bottom:3px;display:block;font-weight:500;text-transform:uppercase;letter-spacing:.5px}
        .cr{display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:4px;cursor:pointer;transition:background .1s;font-size:.8rem}.cr:hover{background:rgba(255,255,255,.04)}.cr.active{background:rgba(249,115,22,.12);border-left:2px solid #f97316}
        input[type=range]{accent-color:#f97316;width:100%}input[type=color]{border:none;background:none;cursor:pointer;width:28px;height:22px;padding:0}
        .dz{border:2px dashed rgba(255,255,255,.12);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;padding:10px;text-align:center;font-size:.76rem;color:#666}.dz:hover,.dz.drag{border-color:#f97316;background:rgba(249,115,22,.06);color:#f97316}.dz.has{border-color:rgba(249,115,22,.25);color:#bbb}
        .cap-blk{position:absolute;top:2px;height:18px;border-radius:3px;display:flex;align-items:center;overflow:hidden;font-size:.55rem;color:#fff;cursor:grab;user-select:none}
        .cap-blk .handle{position:absolute;top:0;bottom:0;width:5px;cursor:col-resize;z-index:2}.cap-blk .handle-l{left:0;border-radius:3px 0 0 3px}.cap-blk .handle-r{right:0;border-radius:0 3px 3px 0}.cap-blk .handle:hover{background:rgba(255,255,255,.3)}
      `}</style>

      <div style={{flex:1,display:"flex",minHeight:0}}>
        {/* LEFT */}
        <div style={{width:190,minWidth:190,background:"#111114",borderRight:"1px solid rgba(255,255,255,.06)",padding:"8px 10px",overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:".82rem",fontWeight:700,color:"#e5e5e5",paddingBottom:6,borderBottom:"1px solid rgba(255,255,255,.08)"}}>⚡ Controls</div>
          <div>
            <span className="el">Video</span>
            <div className={`dz ${vFile?"has":""} ${dragVid?"drag":""}`} onClick={()=>vidIn.current?.click()}
              onDragOver={e=>{e.preventDefault();setDragVid(true);}} onDragLeave={()=>setDragVid(false)}
              onDrop={e=>{e.preventDefault();setDragVid(false);const f=e.dataTransfer.files[0];if(f)loadVid(f);}}>
              <input ref={vidIn} type="file" accept="video/*,.mp4,.mkv,.mov,.webm" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)loadVid(f);e.target.value="";}} />
              {vFile?`📹 ${vFile.name.slice(0,18)}`:"Drop video or click"}
            </div>
          </div>
          <div><span className="el">Language</span><select className="es" value={lang} onChange={e=>setLang(e.target.value)}>{LANGS.map(l=><option key={l.c} value={l.c}>{l.n}</option>)}</select></div>

          {/* TRANSCRIBE BUTTON */}
          <button className="eb ep" style={{width:"100%",padding:"10px",fontSize:".88rem"}} onClick={doTranscribe} disabled={!vFile||busy}>
            {busy?"⏳ "+status:"🎙 Transcribe"}
          </button>

          <div style={{borderTop:"1px solid rgba(255,255,255,.06)",paddingTop:6}}>
            <span className="el">Mode</span>
            <div style={{display:"flex",gap:4}}><button className={`eb ${assMode==="pause"?"ep":""}`} style={{flex:1}} onClick={()=>setAssMode("pause")}>Pause</button><button className={`eb ${assMode==="word"?"ep":""}`} style={{flex:1}} onClick={()=>setAssMode("word")}>Word</button></div>
          </div>
          <div><span className="el">Orient</span><div style={{display:"flex",gap:4}}><button className={`eb ${orient==="portrait"?"ep":""}`} style={{flex:1,fontSize:".7rem"}} onClick={()=>{setOrient("portrait");setMaxCh(16);}}>📱Port</button><button className={`eb ${orient==="landscape"?"ep":""}`} style={{flex:1,fontSize:".7rem"}} onClick={()=>{setOrient("landscape");setMaxCh(24);}}>🖥Land</button></div></div>
          {assMode!=="word"&&<div><span className="el">Max: {maxCh}</span><input type="range" min={8} max={48} step={2} value={maxCh} onChange={e=>setMaxCh(+e.target.value)}/></div>}

          <div style={{borderTop:"1px solid rgba(255,255,255,.06)",paddingTop:6,display:"flex",flexDirection:"column",gap:4}}>
            <button className="eb ep" style={{width:"100%",padding:"7px"}} onClick={doExportAss} disabled={!caps.length||busy}>📄 Export ASS</button>
            <button className="eb" style={{width:"100%",padding:"7px",background:"linear-gradient(135deg,#7c3aed,#6d28d9)",color:"#fff",border:"none",fontWeight:600}} onClick={doExportVid} disabled={!vUrl||!caps.length||busy}>🎬 Export Video</button>
          </div>
          {status&&!busy&&<div style={{fontSize:".72rem",color:status.includes("✓")?"#4ade80":"#f97316"}}>{status}</div>}
        </div>

        {/* CENTER */}
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#000",position:"relative",minWidth:0}}>
          {vUrl?(<><video ref={vRef} src={vUrl} controls style={{maxWidth:"100%",maxHeight:"100%"}} />
            {aCap&&<div style={{position:"absolute",bottom:52,left:0,right:0,textAlign:"center",pointerEvents:"none",padding:"0 16px"}}>
              <span style={{fontFamily:font.fontName,fontSize:`${Math.min(font.fontSize/2,32)}px`,fontWeight:font.bold?700:400,fontStyle:font.italic?"italic":"normal",color:font.color,
                textShadow:`-${font.outlineW}px -${font.outlineW}px 0 ${font.outline},${font.outlineW}px -${font.outlineW}px 0 ${font.outline},-${font.outlineW}px ${font.outlineW}px 0 ${font.outline},${font.outlineW}px ${font.outlineW}px 0 ${font.outline}`}}>{aCap.text}</span>
            </div>}</>):(<span style={{color:"#444",fontSize:".85rem"}}>Upload video to preview</span>)}
        </div>

        {/* RIGHT */}
        <div style={{width:190,minWidth:190,background:"#111114",borderLeft:"1px solid rgba(255,255,255,.06)",padding:"8px 10px",overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
          <div style={{fontSize:".82rem",fontWeight:700,color:"#e5e5e5",paddingBottom:6,borderBottom:"1px solid rgba(255,255,255,.08)"}}>🎨 Font & Style</div>
          <div><span className="el">Font</span><select className="es" value={font.fontName} onChange={e=>setFont(p=>({...p,fontName:e.target.value}))}>{FONTS.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
          <div><span className="el">Size: {font.fontSize}</span><input type="range" min={24} max={128} step={2} value={font.fontSize} onChange={e=>setFont(p=>({...p,fontSize:+e.target.value}))}/></div>
          <div><span className="el">Color</span><div style={{display:"flex",alignItems:"center",gap:6}}><input type="color" value={font.color} onChange={e=>setFont(p=>({...p,color:e.target.value}))}/><span style={{fontSize:".7rem",color:"#888"}}>{font.color}</span></div></div>
          <div><span className="el">Outline</span><div style={{display:"flex",alignItems:"center",gap:6}}><input type="color" value={font.outline} onChange={e=>setFont(p=>({...p,outline:e.target.value}))}/><span style={{fontSize:".7rem",color:"#888"}}>{font.outline}</span></div></div>
          <div><span className="el">Outline: {font.outlineW}</span><input type="range" min={0} max={6} value={font.outlineW} onChange={e=>setFont(p=>({...p,outlineW:+e.target.value}))}/></div>
          <div><span className="el">Shadow: {font.shadow}</span><input type="range" min={0} max={5} value={font.shadow} onChange={e=>setFont(p=>({...p,shadow:+e.target.value}))}/></div>
          <div style={{display:"flex",gap:4}}><button className={`eb ${font.bold?"ep":""}`} style={{flex:1,fontWeight:700}} onClick={()=>setFont(p=>({...p,bold:!p.bold}))}>B</button><button className={`eb ${font.italic?"ep":""}`} style={{flex:1,fontStyle:"italic"}} onClick={()=>setFont(p=>({...p,italic:!p.italic}))}>I</button></div>
          <div style={{borderTop:"1px solid rgba(255,255,255,.06)",paddingTop:6}}><span className="el">Preview</span>
            <div style={{background:"#000",borderRadius:6,padding:"14px 8px",textAlign:"center",minHeight:50,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:font.fontName,fontSize:`${Math.min(font.fontSize/3,22)}px`,fontWeight:font.bold?700:400,fontStyle:font.italic?"italic":"normal",color:font.color,textShadow:`-${font.outlineW}px -${font.outlineW}px 0 ${font.outline},${font.outlineW}px -${font.outlineW}px 0 ${font.outline},-${font.outlineW}px ${font.outlineW}px 0 ${font.outline},${font.outlineW}px ${font.outlineW}px 0 ${font.outline}`}}>{aCap?.text||"Sample Caption"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Timeline + Captions */}
      <div style={{height:240,minHeight:180,background:"#111114",borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"4px 12px 2px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <button className="eb" style={{padding:"3px 8px",fontSize:".72rem"}} onClick={()=>{const v=vRef.current;if(v)playing?v.pause():v.play();}}>{playing?"⏸":"▶"}</button>
            <span style={{fontSize:".7rem",color:"#999",fontFamily:"monospace"}}>{fmt(ct)} / {fmt(dur)}</span>
          </div>
          {/* Timeline */}
          <div ref={tlRef} onClick={seekTl} style={{position:"relative",height:52,background:"#1a1a1e",borderRadius:6,cursor:"pointer",overflow:"hidden",border:"1px solid rgba(255,255,255,.06)"}}>
            <div style={{position:"absolute",top:2,left:0,right:0,height:18,background:"linear-gradient(90deg,#1e3a5f,#1e4d5f)",borderRadius:3,margin:"0 2px",display:"flex",alignItems:"center",paddingLeft:6}}><span style={{fontSize:".58rem",color:"rgba(255,255,255,.5)"}}>🎬 Video</span></div>
            {/* Caption track */}
            <div style={{position:"absolute",top:24,left:0,right:0,height:24}}>
              {dur>0&&caps.map((c,i)=>{const l=`${(c.start/dur)*100}%`;const w=`${((c.end-c.start)/dur)*100}%`;return(
                <div key={c.id} className="cap-blk" title={c.text} style={{left:l,width:w,minWidth:4,background:i===aIdx?"linear-gradient(135deg,#f97316,#fb923c)":"linear-gradient(135deg,#f9731655,#fb923c44)",border:i===aIdx?"1px solid #f97316":"1px solid rgba(249,115,22,.2)"}}
                  onMouseDown={e=>onCapMouseDown(e,c,"move")}>
                  <div className="handle handle-l" onMouseDown={e=>onCapMouseDown(e,c,"left")}/>
                  <span style={{paddingLeft:7,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",pointerEvents:"none"}}>{c.text.slice(0,8)}</span>
                  <div className="handle handle-r" onMouseDown={e=>onCapMouseDown(e,c,"right")}/>
                </div>);
              })}
            </div>
            {dur>0&&<div style={{position:"absolute",top:0,bottom:0,left:`${(ct/dur)*100}%`,width:2,background:"#f97316",zIndex:5,pointerEvents:"none"}}><div style={{position:"absolute",top:-2,left:-4,width:10,height:6,background:"#f97316",borderRadius:"2px 2px 0 0"}}/></div>}
          </div>
        </div>
        {/* Caption list */}
        <div style={{flex:1,overflowY:"auto",padding:"2px 8px"}}>
          <div style={{padding:"3px 8px",borderBottom:"1px solid rgba(255,255,255,.04)",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:".73rem",fontWeight:600,color:"#999"}}>📝 Captions ({caps.length})</span>
            <button className="eb" style={{fontSize:".68rem",padding:"2px 8px"}} onClick={()=>{const id=caps.length;const s=caps.length?caps[caps.length-1].end:.0;setCaps(p=>[...p,{id,start:s,end:s+2,text:"New caption"}]);}}>+ Add</button>
          </div>
          {caps.length===0?(<div style={{padding:16,textAlign:"center",color:"#444",fontSize:".8rem"}}>Transcribe video or add captions manually</div>):(
            caps.map((c,i)=>(<div key={c.id} className={`cr ${i===aIdx?"active":""}`} onClick={()=>{if(vRef.current){vRef.current.currentTime=c.start;vRef.current.play();}}}>
              <span style={{fontSize:".66rem",color:"#666",fontFamily:"monospace",minWidth:65}}>{fmt(c.start)}</span>
              <input value={c.text} onChange={e=>setCaps(p=>p.map(x=>x.id===c.id?{...x,text:e.target.value}:x))} onClick={e=>e.stopPropagation()} style={{flex:1,background:"none",border:"none",color:"#ddd",fontSize:".8rem",outline:"none",fontFamily:"inherit"}}/>
              <button style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:".7rem",padding:"2px"}} onClick={e=>{e.stopPropagation();setCaps(p=>p.filter(x=>x.id!==c.id));}}>✕</button>
            </div>))
          )}
        </div>
      </div>
    </div>
  );
}
