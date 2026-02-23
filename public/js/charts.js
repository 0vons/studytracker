"use strict";
const C = {
  COLORS: ["#4f46e5","#06b6d4","#10b981","#f59e0b","#e11d48","#8b5cf6","#0891b2","#059669"],
  GRID: "#252b3b",
  TEXT: "#6b7280",
  PRIMARY: "#4f46e5",
  BG: "#171b26",

  dpr(canvas){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    return { ctx, w: rect.width, h: rect.height };
  },

  roundRect(ctx, x, y, w, h, r){
    if(h <= 0) return;
    r = Math.min(r, h/2, w/2);
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
  }
};

function drawWeekBar(canvasId, data){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  canvas.style.width  = "100%";
  canvas.style.height = "220px";
  const { ctx, w, h } = C.dpr(canvas);
  ctx.clearRect(0,0,w,h);

  const PAD = { top:16, right:12, bottom:36, left:40 };
  const cw = w - PAD.left - PAD.right;
  const ch = h - PAD.top  - PAD.bottom;

  const labels = data.map(d => d.label);
  const values = data.map(d => d.hours);
  const maxVal = Math.max(...values, 1);
  const barW   = Math.floor(cw / labels.length * 0.55);
  const gap    = cw / labels.length;

  const gridLines = 5;
  for(let i=0; i<=gridLines; i++){
    const y = PAD.top + ch - (ch / gridLines * i);
    ctx.beginPath();
    ctx.strokeStyle = C.GRID;
    ctx.lineWidth   = 1;
    ctx.setLineDash([4,4]);
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + cw, y);
    ctx.stroke();
    ctx.setLineDash([]);

    const val = (maxVal / gridLines * i).toFixed(1);
    ctx.fillStyle   = C.TEXT;
    ctx.font        = "10px Inter, sans-serif";
    ctx.textAlign   = "right";
    ctx.fillText(val, PAD.left - 6, y + 4);
  }

  values.forEach((v, i) => {
    const barH = (v / maxVal) * ch;
    const x    = PAD.left + gap * i + gap * 0.5 - barW * 0.5;
    const y    = PAD.top  + ch - barH;

    const grad = ctx.createLinearGradient(x, y, x, y + barH);
    grad.addColorStop(0,  "#4f46e5");
    grad.addColorStop(1, "rgba(79,70,229,.3)");
    ctx.fillStyle = grad;
    C.roundRect(ctx, x, y, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle   = C.TEXT;
    ctx.font        = "11px Inter, sans-serif";
    ctx.textAlign   = "center";
    ctx.fillText(labels[i], PAD.left + gap * i + gap * 0.5, h - PAD.bottom + 16);

    if(v > 0){
      ctx.fillStyle = "#c7d2fe";
      ctx.font      = "10px Inter, sans-serif";
      ctx.fillText(v.toFixed(1), PAD.left + gap * i + gap * 0.5, y - 5);
    }
  });
}

function drawRing(canvasId, pct){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0,0,w,h);

  const cx = w/2, cy = h/2;
  const r  = Math.min(w,h) * 0.38;
  const lw = 14;
  const start = -Math.PI/2;
  const end   = start + Math.PI * 2 * Math.min(pct, 1);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.strokeStyle = C.GRID;
  ctx.lineWidth   = lw;
  ctx.stroke();

  if(pct > 0){
    const grad = ctx.createLinearGradient(cx-r, cy, cx+r, cy);
    grad.addColorStop(0, "#4f46e5");
    grad.addColorStop(1, "#06b6d4");
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = lw;
    ctx.lineCap     = "round";
    ctx.stroke();
  }
}

function drawWeekdayBars(canvasId, data){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  canvas.style.width  = "100%";
  canvas.style.height = "200px";
  const { ctx, w, h } = C.dpr(canvas);
  ctx.clearRect(0,0,w,h);

  const PAD = { top:16, right:12, bottom:36, left:40 };
  const cw  = w - PAD.left - PAD.right;
  const ch  = h - PAD.top  - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.avg), 1);
  const barW   = Math.floor(cw / data.length * 0.5);
  const gap    = cw / data.length;

  for(let i=0; i<=4; i++){
    const y = PAD.top + ch - (ch/4)*i;
    ctx.beginPath();
    ctx.strokeStyle = C.GRID;
    ctx.lineWidth   = 1;
    ctx.setLineDash([3,3]);
    ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left+cw, y);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.TEXT;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText((maxVal/4*i).toFixed(1), PAD.left-5, y+4);
  }

  data.forEach((d, i) => {
    const barH = (d.avg / maxVal) * ch;
    const x    = PAD.left + gap*i + gap*0.5 - barW*0.5;
    const y    = PAD.top  + ch - barH;

    const grad = ctx.createLinearGradient(x, y, x, y+barH);
    grad.addColorStop(0, C.COLORS[i % C.COLORS.length]);
    grad.addColorStop(1, "rgba(79,70,229,.2)");
    ctx.fillStyle = grad;
    C.roundRect(ctx, x, y, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = C.TEXT;
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(d.label, PAD.left + gap*i + gap*0.5, h - PAD.bottom + 16);
  });
}

function drawTrendLine(canvasId, data){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  canvas.style.width  = "100%";
  canvas.style.height = "200px";
  const { ctx, w, h } = C.dpr(canvas);
  ctx.clearRect(0,0,w,h);

  const PAD = { top:20, right:20, bottom:36, left:44 };
  const cw  = w - PAD.left - PAD.right;
  const ch  = h - PAD.top  - PAD.bottom;
  const values = data.map(d => d.hours);
  const maxVal = Math.max(...values, 1);
  const n = data.length;
  if(n < 2){ ctx.fillStyle=C.TEXT; ctx.font="13px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("Not enough data yet.", w/2, h/2); return; }

  const pts = data.map((d,i) => ({
    x: PAD.left + (i/(n-1))*cw,
    y: PAD.top  + ch - (d.hours/maxVal)*ch
  }));

  for(let i=0;i<=4;i++){
    const y = PAD.top + ch - (ch/4)*i;
    ctx.beginPath(); ctx.strokeStyle=C.GRID; ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.moveTo(PAD.left,y); ctx.lineTo(PAD.left+cw,y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle=C.TEXT; ctx.font="10px Inter,sans-serif"; ctx.textAlign="right";
    ctx.fillText((maxVal/4*i).toFixed(0)+"h", PAD.left-5, y+4);
  }

  const areaGrad = ctx.createLinearGradient(0, PAD.top, 0, PAD.top+ch);
  areaGrad.addColorStop(0, "rgba(79,70,229,.35)");
  areaGrad.addColorStop(1, "rgba(79,70,229,0)");
  ctx.beginPath();
  ctx.moveTo(pts[0].x, PAD.top+ch);
  ctx.lineTo(pts[0].x, pts[0].y);
  for(let i=1;i<pts.length;i++){
    const mx = (pts[i-1].x+pts[i].x)/2;
    ctx.bezierCurveTo(mx, pts[i-1].y, mx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.lineTo(pts[pts.length-1].x, PAD.top+ch);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for(let i=1;i<pts.length;i++){
    const mx = (pts[i-1].x+pts[i].x)/2;
    ctx.bezierCurveTo(mx, pts[i-1].y, mx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = C.PRIMARY;
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  pts.forEach((p,i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
    ctx.fillStyle = C.PRIMARY;
    ctx.fill();

    ctx.fillStyle = C.TEXT;
    ctx.font = "9px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data[i].label, p.x, h - PAD.bottom + 16);
  });
}
