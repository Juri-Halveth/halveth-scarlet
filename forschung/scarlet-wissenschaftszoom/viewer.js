// Scarlet scientific Earth zoom, adapted from the local V2.5 research candidate.
// The continuous camera/LOD transition does not claim continuous source measurement.
export const TAU = Math.PI * 2
export const RAD = Math.PI / 180
export const MAX_ZOOM = 16
export const LOG_MAX = Math.log(MAX_ZOOM)
export function wrapLongitude(x) { return ((x + Math.PI) % TAU + TAU) % TAU - Math.PI }
export function clampZoom(x) { return Math.min(MAX_ZOOM, Math.max(1, x)) }
export function zoomFromUnit(t) { return Math.exp(Math.max(0, Math.min(1, t)) * LOG_MAX) }
export function unitFromZoom(z) { return Math.log(clampZoom(z)) / LOG_MAX }
export function smoothToward(value, target, dtMs, timeConstantMs = 95) {
  return value + (target - value) * (1 - Math.exp(-Math.max(0, dtMs) / timeConstantMs))
}
function astronomy(ms) {
  const mod = (x, n) => ((x % n) + n) % n
  const jd = ms / 86400000 + 2440587.5, jd0 = Math.floor(jd - .5) + .5
  const d0 = jd0 - 2451545, hours = (jd - jd0) * 24, d = jd - 2451545, t = d / 36525
  const gmst = mod(6.697375 + .065709824279 * d0 + 1.0027379 * hours + .0000258 * t * t, 24) * 15 * RAD
  const g = mod(357.529 + .98560028 * d, 360) * RAD, q = mod(280.459 + .98564736 * d, 360)
  const l = (q + 1.915 * Math.sin(g) + .020 * Math.sin(2 * g)) * RAD
  const e = (23.439 - .00000036 * d) * RAD, ra = Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l))
  const dec = Math.asin(Math.sin(e) * Math.sin(l)), lon = ra - gmst
  return {gmst, sun: [Math.cos(dec) * Math.sin(lon), Math.sin(dec), Math.cos(dec) * Math.cos(lon)]}
}

const vertex = `attribute vec2 p; varying vec2 v; void main(){v=p;gl_Position=vec4(p,0.,1.);}`
const fragment = `precision highp float;
varying vec2 v; uniform sampler2D lowTex; uniform sampler2D highTex; uniform sampler2D dustTex; uniform sampler2D earthTex;
uniform float angle; uniform float latitude; uniform float zoom; uniform float aspect;
uniform float detailBlend; uniform float dustOn; uniform float lightingOn; uniform float reliefMode; uniform vec3 sun;
void main(){
  vec2 p=vec2(v.x*aspect,v.y)*1.12/zoom; float r=length(p);
  vec3 glow=mix(vec3(.11,.64,.86),vec3(.37,.95,.79),smoothstep(-1.,1.,p.x));
  if(r>1.){float a=exp(-(r-1.)*27.)*.49*(1.-smoothstep(1.,1.17,r));gl_FragColor=vec4(glow*a,a);return;}
  vec3 n=vec3(p,sqrt(max(0.,1.-r*r)));
  float c=cos(latitude),s=sin(latitude);
  n=vec3(n.x,n.y*c+n.z*s,-n.y*s+n.z*c);
  float lon=atan(n.x,n.z)+angle, lat=asin(clamp(n.y,-1.,1.));
  vec3 normal=vec3(cos(lat)*sin(lon),sin(lat),cos(lat)*cos(lon));
  vec2 uv=vec2(fract(.5+lon/6.28318530718),.5-lat/3.14159265359);
  vec3 lo=texture2D(lowTex,uv).rgb, hi=texture2D(highTex,uv).rgb;
  vec3 tex=mix(lo,hi,detailBlend);
  vec3 earth=texture2D(earthTex,uv).rgb;
  if(reliefMode>0.5 && reliefMode<1.5){
    float h=tex.r, mask=smoothstep(.005,.05,h);
    tex=mix(earth,earth*(.55+1.3*pow(h,.55)),mask);
  }
  if(reliefMode>1.5){
    float depth=1.-tex.r, mask=smoothstep(.03,.2,depth);
    tex=mix(earth,earth*(1.-.45*depth),mask);
  }
  float day=smoothstep(-.08,.2,dot(normal,sun));
  float rim=pow(1.-sqrt(max(0.,1.-r*r)),3.);
  vec3 col=tex*mix(1.,.23+day*.88,lightingOn);
  float dust=texture2D(dustTex,uv).r*dustOn;
  col=mix(col,vec3(.89,.55,.29),min(.55,dust*.5));
  col+=glow*rim*.36;
  gl_FragColor=vec4(col,1.);
}`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source); gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
  return shader
}
function upload(gl, img) {
  const t = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  const pot = (n) => n > 0 && (n & (n - 1)) === 0
  if (pot(img.width) && pot(img.height)) {
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return t
}
function image(url, crossOrigin = false) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Bild nicht geladen: ${url}`))
    img.src = url
  })
}

const modes = {
  earth: {low:'./assets/nasa_earth_october_2004_2048.jpg', high:'./assets/nasa_earth_october_2004_8192.jpg', label:'NASA Blue Marble Next Generation · Oktober 2004'},
  topography: {low:'./assets/nasa_land_topography_2048.jpg', high:'./assets/nasa_land_topography_8192.jpg', label:'NASA Earth Observatory · Landrelief als Kontrast über NASA-Erdbild'},
  bathymetry: {low:'./assets/nasa_ocean_bathymetry_2048.jpg', high:'./assets/nasa_ocean_bathymetry_8192.jpg', label:'NASA Earth Observatory / GEBCO · Meeresboden als Kontrast über NASA-Erdbild'}
}

async function main() {
  const $ = id => document.getElementById(id)
  const canvas = $('globe'), stage = $('stage'), status = $('status'), sourceLine = $('source-line')
  const zoomInput = $('zoom'), zoomValue = $('zoom-value')
  const buttons = Object.fromEntries(Object.keys(modes).map(key => [key, $(`mode-${key}`)]))
  const controls = [...Object.values(buttons), $('zoom-in'), $('zoom-out'), zoomInput, $('satellite'), $('benchmark'), $('export-8k')]
  const firstSky = astronomy(Date.now())
  const startYaw = Math.atan2(firstSky.sun[0], firstSky.sun[2]) - 40 * RAD + firstSky.gmst
  let mode = 'earth', yaw = startYaw, yawTarget = startYaw, latitude = .28, latTarget = .28
  let logZoom = 0, logTarget = 0, dailyDate = null, satelliteState = 'idle'
  let drawPending = false, lastFrame = 0, lastUI = 0, benchmark = null, exportBusy = false
  let highMode = null, highTexture = null, highToken = 0, detailStart = 0, detailBlend = 0
  let satelliteTexture = null
  try {
    const images = await Promise.all(Object.values(modes).map(cfg => image(cfg.low)))
    const gl = canvas.getContext('webgl', {alpha:true, antialias:false, powerPreference:'high-performance', depth:false, stencil:false, preserveDrawingBuffer:true})
    if (!gl) throw new Error('WebGL auf diesem Gerät nicht verfügbar')
    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    $('gpu-limit').textContent = `${maxTexture.toLocaleString('de-DE')} px`
    const program = gl.createProgram()
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
    gl.useProgram(program)
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'p')
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const lowTextures = Object.fromEntries(Object.keys(modes).map((key, i) => [key, upload(gl, images[i])]))
    const dustTexture = lowTextures.earth
    const uniforms = Object.fromEntries(['angle','latitude','zoom','aspect','detailBlend','dustOn','lightingOn','reliefMode','sun','lowTex','highTex','dustTex','earthTex'].map(name => [name, gl.getUniformLocation(program,name)]))
    gl.uniform1i(uniforms.lowTex, 0); gl.uniform1i(uniforms.highTex, 1); gl.uniform1i(uniforms.dustTex, 2); gl.uniform1i(uniforms.earthTex, 3)
    canvas.dataset.renderer = 'webgl'
    const setStatus = message => { status.textContent = message }

    async function ensureHigh(nextMode) {
      const token = ++highToken
      if (highMode === nextMode && highTexture) return
      if (maxTexture < 8192) {
        setStatus(`GPU-Texturgrenze ${maxTexture}px: Vorschau nutzt niedrigere Auflösung; 8K-Textur ist hier nicht verfügbar.`)
        return
      }
      try {
        const img = await image(modes[nextMode].high)
        if (token !== highToken || mode !== nextMode || satelliteState === 'ready' && mode === 'earth') return
        const nextTexture = upload(gl, img)
        if (highTexture) gl.deleteTexture(highTexture)
        highTexture = nextTexture; highMode = nextMode
        detailStart = performance.now(); detailBlend = 0
        setStatus(`${modes[nextMode].label}: 8192 × 4096 Quelltextur geladen; Detail wird weich eingeblendet.`)
        schedule()
      } catch (error) {
        if (token === highToken) setStatus(`Hochauflösende Textur nicht geladen: ${error.message}. Die Vorschau bleibt bedienbar.`)
      }
    }
    function updateUI(angle, now) {
      const lon = wrapLongitude(angle), phi = latitude
      $('location').textContent = `${(phi/RAD).toFixed(1)}° / ${(lon/RAD).toFixed(1)}°`
      const highActive = highMode === mode && highTexture && !(mode === 'earth' && satelliteState === 'ready')
      $('image-detail').textContent = mode === 'earth' && satelliteState === 'ready' ? 'GIBS 2048 px' : highActive ? '8192 × 4096' : '2048 × 1024'
      for (const [key, button] of Object.entries(buttons)) button.setAttribute('aria-pressed', String(mode === key))
      zoomInput.value = String(unitFromZoom(Math.exp(logTarget)))
      zoomValue.value = `${Math.exp(logZoom).toFixed(2).replace('.', ',')}×`
      $('zoom-out').disabled = logTarget <= 0; $('zoom-in').disabled = logTarget >= LOG_MAX
      sourceLine.textContent = mode === 'earth' && satelliteState === 'ready' ? `NASA MODIS/GIBS · angefragter Bildtag ${dailyDate} · zeitversetzt` : modes[mode].label
      stage.dataset.zoom = Math.exp(logZoom).toFixed(4)
      stage.dataset.mode = mode
      stage.dataset.imageSource = mode === 'earth' && satelliteState === 'ready' ? 'nasa-gibs' : 'nasa-static'
      stage.dataset.detail = highActive ? '8192' : 'preview'
      stage.dataset.renderWidth = String(canvas.width)
      lastUI = now
    }
    function render(width, height, now, update = true) {
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
      gl.viewport(0, 0, width, height)
      const sky = astronomy(Date.now()), angle = 40 * RAD - sky.gmst + yaw
      const low = mode === 'earth' && satelliteState === 'ready' ? satelliteTexture : lowTextures[mode]
      const high = highMode === mode && highTexture && !(mode === 'earth' && satelliteState === 'ready') ? highTexture : low
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, low)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, high)
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, dustTexture)
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, lowTextures.earth)
      gl.uniform1f(uniforms.angle, angle); gl.uniform1f(uniforms.latitude, latitude)
      gl.uniform1f(uniforms.zoom, Math.exp(logZoom)); gl.uniform1f(uniforms.aspect, width / height)
      gl.uniform1f(uniforms.detailBlend, high === low ? 0 : detailBlend)
      gl.uniform1f(uniforms.dustOn, 0)
      gl.uniform1f(uniforms.lightingOn, mode === 'earth' ? 1 : 0)
      gl.uniform1f(uniforms.reliefMode, mode === 'topography' ? 1 : mode === 'bathymetry' ? 2 : 0)
      gl.uniform3fv(uniforms.sun, sky.sun)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      if (update) updateUI(angle, now)
    }
    function draw(now) {
      drawPending = false
      if (document.hidden || exportBusy) return
      const dt = lastFrame ? Math.min(100, now - lastFrame) : 16.7; lastFrame = now
      logZoom = smoothToward(logZoom, logTarget, dt)
      yaw = smoothToward(yaw, yawTarget, dt)
      latitude = smoothToward(latitude, latTarget, dt)
      if (highMode === mode && highTexture && detailBlend < 1) detailBlend = Math.min(1, (now - detailStart) / 450)
      const n = Math.min(1440, Math.max(320, Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 1.7))))
      render(n, n, now, now - lastUI > 35)
      if (benchmark) {
        benchmark.frames.push(now)
        if (now - benchmark.start >= 3000) {
          const frames = benchmark.frames, gaps = frames.slice(1).map((t, i) => t - frames[i]).sort((a, b) => a - b)
          const fps = (frames.length - 1) * 1000 / (frames.at(-1) - frames[0])
          const p95 = gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * .95))]
          $('fps-result').textContent = `${fps.toFixed(1)} FPS · p95 ${p95.toFixed(1)} ms`
          stage.dataset.benchmarkFps = fps.toFixed(2); stage.dataset.benchmarkP95Ms = p95.toFixed(2)
          setStatus(`Gemessene rAF-Bildrate: ${fps.toFixed(1)} FPS bei ${n} × ${n} Renderpixeln, p95 ${p95.toFixed(1)} ms. Ziel 120 FPS ${fps >= 119.5 ? 'erreicht' : 'hier nicht belegt'}.`)
          benchmark = null; $('benchmark').disabled = false
        }
      }
      if (Math.abs(logZoom-logTarget) > .00002 || Math.abs(yaw-yawTarget) > .00002 || Math.abs(latitude-latTarget) > .00002 || detailBlend < 1 && highMode === mode && !!highTexture || benchmark) schedule()
    }
    function schedule() { if (!drawPending) { drawPending = true; requestAnimationFrame(draw) } }
    function setZoom(z) { if (!Number.isFinite(z)) return; logTarget = Math.log(clampZoom(z)); schedule() }
    function shift(dx, dy) { yawTarget -= dx * .007 / Math.exp(logZoom); latTarget = Math.max(-1.55, Math.min(1.55, latTarget + dy * .005 / Math.exp(logZoom))); schedule() }
    function setMode(next) {
      if (mode === next && !(next === 'earth' && satelliteState === 'ready')) return
      pointers.clear()
      if (next === 'earth' && satelliteState === 'ready') satelliteState = 'idle'
      mode = next; detailBlend = 0; highToken++
      detailStart = performance.now()
      setStatus(`${modes[next].label}. Auflösung wird ohne Wechsel des Blickwinkels verfeinert.`)
      schedule(); ensureHigh(next)
    }
    for (const [key, button] of Object.entries(buttons)) button.addEventListener('click', () => setMode(key))
    $('zoom-in').addEventListener('click', () => setZoom(Math.exp(logTarget) * 1.35))
    $('zoom-out').addEventListener('click', () => setZoom(Math.exp(logTarget) / 1.35))
    zoomInput.addEventListener('input', () => setZoom(zoomFromUnit(Number(zoomInput.value))))
    stage.addEventListener('wheel', event => { event.preventDefault(); pointers.clear(); setZoom(Math.exp(logTarget) * Math.exp(-event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1) * .0015)) }, {passive:false})
    const pointers = new Map()
    const distance = () => { const p = [...pointers.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y) }
    stage.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse' && event.button !== 0) return; pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,t:performance.now()}); stage.setPointerCapture(event.pointerId) })
    stage.addEventListener('pointermove', event => { if(event.buttons===0){pointers.delete(event.pointerId);return} const old=pointers.get(event.pointerId); if(!old)return; const dx=event.clientX-old.x,dy=event.clientY-old.y; if(performance.now()-old.t>3000||Math.hypot(dx,dy)>100){pointers.delete(event.pointerId);return} const before=distance(); pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,t:performance.now()}); if(pointers.size===2){const after=distance();if(before>0&&after>0)setZoom(Math.exp(logTarget)*after/before)}else shift(dx,dy) })
    for (const type of ['pointerup','pointercancel','lostpointercapture']) stage.addEventListener(type,event=>pointers.delete(event.pointerId))
    window.addEventListener('pointerup', event => pointers.delete(event.pointerId))
    window.addEventListener('blur', () => pointers.clear())
    stage.addEventListener('keydown', event => {
      if (['+','=','-','_'].includes(event.key)) {event.preventDefault(); setZoom(Math.exp(logTarget)*(event.key==='+'||event.key==='='?1.35:1/1.35))}
      else if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) {
        event.preventDefault()
        if (event.key==='Home') { yawTarget=startYaw; latTarget=.28; setZoom(1) }
        else shift(event.key==='ArrowLeft'?-16:event.key==='ArrowRight'?16:0,event.key==='ArrowUp'?-16:event.key==='ArrowDown'?16:0)
      }
    })
    $('benchmark').addEventListener('click', () => {
      if (benchmark) return
      benchmark = {start:performance.now(),frames:[]}; $('benchmark').disabled = true
      $('fps-result').textContent = 'Messung läuft …'; schedule()
    })
    $('export-8k').addEventListener('click', async () => {
      if (exportBusy) return
      const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
      if (!highTexture || highMode !== mode || mode === 'earth' && satelliteState === 'ready' || viewport[0] < 7680 || viewport[1] < 4320) {
        setStatus('8K-Export braucht die geladene 8192er Quelltextur und einen GPU-Viewport von mindestens 7680 × 4320.'); return
      }
      exportBusy = true; $('export-8k').disabled = true; stage.style.visibility = 'hidden'
      const oldW = canvas.width, oldH = canvas.height
      try {
        detailBlend = 1
        render(7680, 4320, performance.now(), false)
        if (gl.isContextLost()) throw new Error('WebGL-Kontext bei 8K verloren')
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        if (!blob || blob.size < 100000) throw new Error('kein gültiges PNG erzeugt')
        const url = URL.createObjectURL(blob), anchor = document.createElement('a')
        anchor.href = url; anchor.download = `scarlet-earth-${mode}-7680x4320.png`
        anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000)
        setStatus(`8K-Standbild ${mode}: 7680 × 4320 PNG erzeugt (${(blob.size/1048576).toFixed(1)} MiB). Das ist keine 8K-Echtzeit-FPS-Messung.`)
      } catch (error) { setStatus(`8K-Export nicht abgeschlossen: ${error.message}`) }
      finally { canvas.width=oldW; canvas.height=oldH; exportBusy=false; $('export-8k').disabled=false; stage.style.visibility=''; schedule() }
    })
    $('satellite').addEventListener('click', async () => {
      const day = new Date(Date.now()-86400000).toISOString().slice(0,10)
      dailyDate=day; satelliteState='loading'; setStatus(`NASA-Tagesmosaik für ${day} wird angefragt.`)
      const url = new URL('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi')
      url.search = new URLSearchParams({SERVICE:'WMS',REQUEST:'GetMap',VERSION:'1.1.1',LAYERS:'MODIS_Terra_CorrectedReflectance_TrueColor',STYLES:'',FORMAT:'image/jpeg',SRS:'EPSG:4326',BBOX:'-180,-90,180,90',WIDTH:'2048',HEIGHT:'1024',TIME:day}).toString()
      let timer
      try {
        const img = await Promise.race([image(url.href,true),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Zeitüberschreitung')),15000)})])
        if (img.naturalWidth!==2048||img.naturalHeight!==1024) throw new Error('unerwartete Bildgröße')
        if (satelliteTexture) gl.deleteTexture(satelliteTexture)
        satelliteTexture=upload(gl,img); satelliteState='ready'; mode='earth'
        setStatus(`NASA-MODIS-Mosaik für angefragten Tag ${day} geladen; zeitversetzte Abdeckung, kein Live-Video.`)
      } catch (error) { satelliteState='error'; setStatus(`Tagesmosaik nicht verfügbar: ${error.message}. Gespeicherte NASA-Karte bleibt sichtbar.`) }
      finally { clearTimeout(timer); schedule() }
    })
    window.addEventListener('resize', schedule)
    document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule() })
    setStatus('WebGL bereit. Blick und Zoom gleiten kontinuierlich; hochauflösende Detailquelle lädt im Hintergrund.')
    schedule(); ensureHigh('earth')
  } catch (error) {
    controls.forEach(el => el.disabled = true)
    status.textContent = `Interaktive Ansicht nicht gestartet: ${error.message}`
    canvas.dataset.renderer='unavailable'
  }
}
if (typeof document !== 'undefined') main()
