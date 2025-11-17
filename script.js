// Device detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const textElement = document.createElement('div');
textElement.innerHTML = isMobile ? '↑ Swipe to reveal ↑' : 'Scroll to reveal';
Object.assign(textElement.style, {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: isMobile ? '24px' : '18px',
  fontFamily: 'system-ui, sans-serif',
  fontWeight: '300',
  letterSpacing: '2px',
  textAlign: 'center',
  zIndex: '1000',
  pointerEvents: 'none',
  transition: 'opacity 0.5s ease',
  textShadow: '0 2px 10px rgba(0,0,0,0.5)'
});
document.body.appendChild(textElement);

let mouse = {
  x: undefined,
  y: undefined,
  radius: 120
};

// Scroll dissolve effect
let scrollProgress = 0;
let targetScrollProgress = 0;
const maxScroll = 1000; // Adjust based on your page content
let hasInteracted = false;
let isScrollLocked = true; // Start with scroll locked
let isOverlayHidden = false;

// Prevent default scroll behavior
function preventDefaultScroll(e) {
  if (isScrollLocked && !isOverlayHidden) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

// Add scroll prevention listeners
window.addEventListener('wheel', preventDefaultScroll, { passive: false });
window.addEventListener('touchmove', preventDefaultScroll, { passive: false });
document.addEventListener('gesturestart', preventDefaultScroll);
document.addEventListener('gesturechange', preventDefaultScroll);
document.addEventListener('gestureend', preventDefaultScroll);

function handleScroll(e) {
  if (isOverlayHidden) return; // Ignore if overlay is already hidden
  
  if (!hasInteracted) {
    hasInteracted = true;
    // Fade out text after first interaction
    textElement.style.opacity = '0';
    setTimeout(() => {
      textElement.style.display = 'none';
    }, 500);
  }
  
  if (isScrollLocked) {
    // Only allow scroll progress to increase when locked
    if (e.deltaY > 0) {
      targetScrollProgress = Math.min(maxScroll, targetScrollProgress + e.deltaY * 0.5);
    }
  } else {
    // Allow normal scrolling when unlocked
    targetScrollProgress = Math.min(maxScroll, Math.max(0, targetScrollProgress + e.deltaY * 0.5));
  }
}

function handleTouch(e) {
  if (isOverlayHidden) return; // Ignore if overlay is already hidden
  
  if (!hasInteracted) {
    hasInteracted = true;
    textElement.style.opacity = '0';
    setTimeout(() => {
      textElement.style.display = 'none';
    }, 500);
  }
  
  if (isScrollLocked) {
    // Only allow progress increase when locked
    targetScrollProgress = Math.min(maxScroll, targetScrollProgress + 10);
  } else {
    // Allow normal progress when unlocked
    targetScrollProgress = Math.min(maxScroll, Math.max(0, targetScrollProgress + 10));
  }
}

// Add click/tap to dismiss text on mobile
function handleClick() {
  if (isOverlayHidden) return;
  
  if (!hasInteracted) {
    hasInteracted = true;
    textElement.style.opacity = '0';
    setTimeout(() => {
      textElement.style.display = 'none';
    }, 500);
  }
}

// Update scroll and touch listeners to use passive: false for prevention
window.addEventListener("wheel", handleScroll, { passive: false });
window.addEventListener("touchmove", handleTouch, { passive: false });
window.addEventListener("click", handleClick);

function hideOverlay() {
  if (isOverlayHidden) return;
  
  isOverlayHidden = true;
  isScrollLocked = false;
  
  // Hide the canvas with transition
  canvas.classList.add('hidden');
  
  // Remove all event listeners
  window.removeEventListener('wheel', preventDefaultScroll);
  window.removeEventListener('touchmove', preventDefaultScroll);
  window.removeEventListener("wheel", handleScroll);
  window.removeEventListener("touchmove", handleTouch);
  window.removeEventListener("click", handleClick);
  window.removeEventListener("mousemove", mousemove);
  window.removeEventListener("touchmove", touchmove);
  window.removeEventListener("mouseout", mouseout);
  window.removeEventListener("touchend", mouseout);
  document.removeEventListener('gesturestart', preventDefaultScroll);
  document.removeEventListener('gesturechange', preventDefaultScroll);
  document.removeEventListener('gestureend', preventDefaultScroll);
  
  // Remove text element
  if (textElement.parentNode) {
    textElement.parentNode.removeChild(textElement);
  }
  
  console.log('Overlay hidden - normal page interaction restored');
}

function mousemove(e) {
  if (isOverlayHidden) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left);
  mouse.y = (e.clientY - rect.top);
}

function touchmove(e) {
  if (isOverlayHidden) return;
  if (e.touches && e.touches.length > 0) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.touches[0].clientX - rect.left);
    mouse.y = (e.touches[0].clientY - rect.top);
  }
}

function mouseout() {
  if (isOverlayHidden) return;
  mouse.x = undefined;
  mouse.y = undefined;
}

window.addEventListener("mousemove", mousemove);
window.addEventListener("touchmove", touchmove);
window.addEventListener("mouseout", mouseout);
window.addEventListener("touchend", mouseout);

// WebGL Glass Morph
const canvas = document.getElementById("c");
const gl = canvas.getContext("webgl", { 
  alpha: true,
  premultipliedAlpha: false
});
if (!gl) {
  alert("WebGL not supported");
  throw new Error("WebGL not supported");
}

function resize() {
  if (isOverlayHidden) return;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const w = Math.floor(innerWidth * dpr),
    h = Math.floor(innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
}
addEventListener("resize", resize);
resize();

const vertSrc = `
  attribute vec2 aPos; varying vec2 vUV;
  void main(){ vUV=0.5*(aPos+1.0); gl_Position=vec4(aPos,0.0,1.0); }
`;

const fragSrc = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  #ifdef GL_OES_standard_derivatives
  #extension GL_OES_standard_derivatives : enable
  #endif
  uniform vec2  iResolution;
  uniform float iTime;
  uniform vec2  iMouse;
  uniform sampler2D iChannel0;

  uniform float uCell, uAmp, uChrom, uSpeed, uAnimate, uBlur;
  uniform vec2  uUVOffset;
  uniform float uUVScale, uEnableRipple;
  uniform vec2  uRippleC;
  uniform float uRippleT;
  uniform float uMouseRadius;
  uniform float uMousePullStrength;
  uniform float uMouseInfluence;
  uniform float uScrollProgress; // New uniform for scroll effect

  varying vec2 vUV;

  float safeFwidth(float x){
    #ifdef GL_OES_standard_derivatives
    return fwidth(x);
    #else
    return 1.0;
    #endif
  }

  vec2 hex_pixel_to_axial(vec2 p, float s){
    float q = (1.7320508/3.0*p.x - 0.3333333*p.y)/s;
    float r = (0.6666667*p.y)/s;
    return vec2(q,r);
  }
  vec3 cube_round(vec3 c){
    float rx=floor(c.x+0.5), ry=floor(c.y+0.5), rz=floor(c.z+0.5);
    float dx=abs(rx-c.x), dy=abs(ry-c.y), dz=abs(rz-c.z);
    if(dx>dy && dx>dz) rx=-ry-rz; else if(dy>dz) ry=-rx-rz; else rz=-rx-ry;
    return vec3(rx,ry,rz);
  }
  vec2 hex_axial_round(vec2 qr){
    vec3 cube=vec3(qr.x, -qr.x-qr.y, qr.y);
    vec3 rc=cube_round(cube);
    return vec2(rc.x, rc.z);
  }
  vec2 hex_axial_to_pixel(vec2 qr, float s){
    float x=s*(1.7320508*qr.x + 0.8660254*qr.y);
    float y=s*(1.5*qr.y);
    return vec2(x,y);
  }

  float sdHex(vec2 p, float r){
    p=abs(p);
    return max(dot(p, normalize(vec2(1.0,1.7320508))) - r, p.x - r);
  }

  void nearestCenter(vec2 p, float cell, out vec2 c, out vec2 lp){
    vec2 qr  = hex_pixel_to_axial(p, cell);
    vec2 qrr = hex_axial_round(qr);
    c = hex_axial_to_pixel(qrr, cell);
    lp = p - c;
  }

  float shapeSDF(vec2 lp, float cell){
    return sdHex(lp, cell*0.95);
  }

  vec3 sampleImage(vec2 uv){ 
    return texture2D(iChannel0, uv).rgb; 
  }

  vec3 blur(vec2 uv, float blur) {
    vec3 col = vec3(0.0);
    float tot = 0.0;
    for(int i = -3; i <= 3; i++) {
      for(int j = -3; j <= 3; j++) {
        float d = length(vec2(float(i), float(j))) / 4.24;
        float w = exp(-d * d * 2.0);
        col += sampleImage(uv + vec2(float(i), float(j)) * blur * 0.001) * w;
        tot += w;
      }
    }
    return col / tot;
  }

  void main(){
    vec2 res=iResolution, frag=gl_FragCoord.xy, p=frag-0.5*res, uv=vUV;
    vec2 mp=iMouse-0.5*res;

    vec2 uvw=(uv-0.5)/max(1.0e-3,uUVScale) + uUVOffset + 0.5;

    float cell=max(6.0,uCell);
    float t=iTime*uSpeed;
    float wave=(uAnimate>0.5)?(sin(p.x*0.01 + p.y*0.015 + t)*0.25):0.0;
    float localCell=cell*(1.0+wave*0.2);

    // Mouse pull effect (like particle repulsion)
    vec2 mousePull = vec2(0.0);
    float distToMouse = length(p - mp);
    
    // Calculate blur amount - de-blur in mouse area (inverted logic)
    float eraserMask = smoothstep(uMouseRadius, uMouseRadius * 0.5, distToMouse);
    float blurAmount = uBlur * (1.0 - eraserMask);
    
    if (distToMouse < uMouseRadius) {
      float force = (uMouseRadius - distToMouse) / uMouseRadius; // 0 ~ 1
      vec2 forceDir = normalize((p - mp) + 1e-6);
      mousePull = -forceDir * force * uMousePullStrength;
    }
    
    vec2 pulledP = p + mousePull;
    
    // Mouse influence on cell size
    float mouseInfluence = smoothstep(uMouseRadius, 0.0, distToMouse) * uMouseInfluence;
    float scaledCell = localCell * (1.0 + mouseInfluence * 0.5);
    
    vec2 c, lp; 
    nearestCenter(pulledP, scaledCell, c, lp);
    
    float d = shapeSDF(lp, scaledCell);
    float inside = smoothstep(0.0, 1.5, -d);

    float rad = clamp(length(lp) / (scaledCell*0.95), 0.0, 1.0);
    vec2 n = normalize(lp + 1e-6);

    float ripple=0.0; 
    vec2 rippleDir=vec2(0.0);
    if(uEnableRipple>0.5 && uRippleC.x>=0.0){
      vec2 cp=uRippleC-0.5*res; 
      float R=length(p-cp); 
      float dt=max(0.0,iTime-uRippleT);
      float env=exp(-R*0.006)*exp(-dt*1.0); 
      ripple=sin(R*0.06 - dt*6.0)*env;
      rippleDir=normalize(p-cp+1e-6);
    }
    
    vec3 base=blur(uvw, blurAmount);
    // Add clear unblurred sample in eraser area
    vec3 clear = sampleImage(uvw);
    base = mix(clear, base, eraserMask);
    
    float strength=uAmp*(1.0-pow(rad,1.4))*0.07;
    vec2 refr=n*strength + rippleDir*(0.02*ripple);

    vec2 ca=refr*(0.25*uChrom); 
    float ca2=0.6*uChrom;
    vec3 glass;
    glass.r=sampleImage(uvw+refr+ca).r;
    glass.g=sampleImage(uvw+refr).g;
    glass.b=sampleImage(uvw+refr-ca*ca2).b;

    vec2 L=normalize(mp);
    float spec=pow(max(0.0,dot(normalize(L),n)),14.0)*(1.0-rad);
    glass+=vec3(1.0,0.96,0.9)*spec*0.45;

    float glassEffect = inside * (1.0 - eraserMask);
    // Change the final output to be transparent where there's no glass
    vec3 col = mix(vec3(0.9, 0.9, 0.95), glass, 0.4) * inside;

    // Scroll dissolve effect - fog clearing
    float scrollFactor = uScrollProgress / 1000.0; // Normalize to 0-1
    float dissolve = smoothstep(0.0, 1.0, scrollFactor);
    
    // Create vertical wipe effect - top clears first
    float verticalWipe = smoothstep(0.0, 1.0, (frag.y / res.y) + scrollFactor * 1.5 - 0.5);
    
    // Combine effects
    float finalAlpha = inside * (1.0 - dissolve * verticalWipe);

    float vign=smoothstep(1.2,0.2,length((frag-0.5*res)/res.y));
    col*=mix(0.9,1.0,vign);
    gl_FragColor = vec4(col, finalAlpha);
  }
`;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        throw new Error("Shader compile error");
      }
      return s;
    }
    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      throw new Error("Link error");
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "iResolution");
    const uTime = gl.getUniformLocation(prog, "iTime");
    const uMouse = gl.getUniformLocation(prog, "iMouse");
    const uCell = gl.getUniformLocation(prog, "uCell");
    const uAmp = gl.getUniformLocation(prog, "uAmp");
    const uChrom = gl.getUniformLocation(prog, "uChrom");
    const uSpeed = gl.getUniformLocation(prog, "uSpeed");
    const uAnim = gl.getUniformLocation(prog, "uAnimate");
    const uBlur = gl.getUniformLocation(prog, "uBlur");

    const uUVOffset = gl.getUniformLocation(prog, "uUVOffset");
    const uUVScale = gl.getUniformLocation(prog, "uUVScale");
    const uEnableRipple = gl.getUniformLocation(prog, "uEnableRipple");
    const uRippleC = gl.getUniformLocation(prog, "uRippleC");
    const uRippleT = gl.getUniformLocation(prog, "uRippleT");
    const uMouseRadius = gl.getUniformLocation(prog, "uMouseRadius");
    const uMousePullStrength = gl.getUniformLocation(prog, "uMousePullStrength");
    const uMouseInfluence = gl.getUniformLocation(prog, "uMouseInfluence");
    const uTex0 = gl.getUniformLocation(prog, "iChannel0");
    gl.uniform1i(uTex0, 0);

    let tex0 = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );

    // Add scroll uniform location
const uScrollProgress = gl.getUniformLocation(prog, "uScrollProgress");


    // Hardcoded settings
    const glass = 0.6;      // uAmp
    const chromatic = 0.4;  // uChrom
    const breathSpeed = 0.2; // uSpeed
    const cellSize = 2;    // uCell
    const animate = true;   // Enable wave animation
    const blur = 8.0;       // Video blur amount
    
    let uvOffset = { x: 0, y: 0 };
    let uvScale = 1.0;
    let mouseSm = [canvas.width / 2, canvas.height / 2];
    let mouseFactorTarget = 0;


function draw(tms) {
  if (isOverlayHidden) return; // Stop drawing if overlay is hidden
  
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  resize();
  const t = tms * 0.001;

  // Smooth scroll progress
  scrollProgress += (targetScrollProgress - scrollProgress) * 0.1;

  // Check if scroll effect is nearly complete (90% threshold)
  const scrollThreshold = maxScroll * 0.9;
  if (scrollProgress >= scrollThreshold && isScrollLocked && !isOverlayHidden) {
    // Hide the overlay instead of just unlocking scroll
    setTimeout(hideOverlay, 300); // Small delay for smooth transition
  }

  // Smooth mouse tracking
  let mouseTarget = [canvas.width / 2, canvas.height / 2];
  if (mouse.x !== undefined && mouse.y !== undefined) {
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    mouseTarget = [
      mouse.x * scaleX, 
      canvas.height - (mouse.y * scaleY)
    ];
  }

  const k = 1.0 - Math.exp(-0.25);
  mouseSm[0] += (mouseTarget[0] - mouseSm[0]) * k;
  mouseSm[1] += (mouseTarget[1] - mouseSm[1]) * k;

  gl.useProgram(prog);
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uTime, t);
  gl.uniform2f(uMouse, mouseSm[0], mouseSm[1]);
  gl.uniform1f(uScrollProgress, scrollProgress); // Pass scroll progress to shader

  gl.uniform1f(uCell, cellSize);
  gl.uniform1f(uAmp, glass);
  gl.uniform1f(uChrom, chromatic);
  gl.uniform1f(uSpeed, breathSpeed);
  gl.uniform1f(uAnim, animate ? 1.0 : 0.0);
  gl.uniform1f(uBlur, blur);

  gl.uniform2f(uUVOffset, uvOffset.x, uvOffset.y);
  gl.uniform1f(uUVScale, uvScale);

  gl.uniform1f(uEnableRipple, 0.0);
  gl.uniform2f(uRippleC, -1, -1);
  gl.uniform1f(uRippleT, 0);

  gl.uniform1f(uMouseInfluence, 1.0);
  gl.uniform1f(uMouseRadius, 150.0);
  gl.uniform1f(uMousePullStrength, 30.0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);