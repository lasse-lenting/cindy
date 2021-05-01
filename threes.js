/**
 * WebGL experiments inspired by Yuri Artiukh (Akella):
 *  - https://twitter.com/akella
 *  - https://www.youtube.com/channel/UCDo7RTzizoOdPjY8A-xDR7g 
 *
 * My WebGL boilerplate:
 *  - https://gist.github.com/alsolovyev/06703411f9275a6e37cc6fae701449fd
 * 
 * Full screen mode for a better experience:
 *  - https://codepen.io/janeRivas/full/GRrRbEY
 * 
 * 
 * Made with ❤ by janeRivas <solovyev.a@icloud.com>
 */
 import * as THREE from '../build/three.module.js';

 import Stats from './jsm/libs/stats.module.js';
 import { GUI } from './jsm/libs/dat.gui.module.js';

 import { OrbitControls } from './jsm/controls/OrbitControls.js';
 import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
 import { RenderPass } from './jsm/postprocessing/RenderPass.js';
 import { ShaderPass } from './jsm/postprocessing/ShaderPass.js';
 import { RGBShiftShader } from "./jsm/shaders/RGBShiftShader.js";
 import { FilmPass } from "./jsm/postprocessing/FilmPass.js";
 import { FXAAShader } from "./jsm/shaders/FXAAShader.js";
 
 const noise = `
   //	Simplex 4D Noise 
   //	by Ian McEwan, Ashima Arts
   //
   vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
   float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
   vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
   float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}
 
   vec4 grad4(float j, vec4 ip){
     const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
     vec4 p,s;
 
     p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
     p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
     s = vec4(lessThan(p, vec4(0.0)));
     p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 
 
     return p;
   }
 
   float snoise(vec4 v){
     const vec2  C = vec2( 0.138196601125010504,  // (5 - sqrt(5))/20  G4
                           0.309016994374947451); // (sqrt(5) - 1)/4   F4
     // First corner
     vec4 i  = floor(v + dot(v, C.yyyy) );
     vec4 x0 = v -   i + dot(i, C.xxxx);
 
     // Other corners
 
     // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
     vec4 i0;
 
     vec3 isX = step( x0.yzw, x0.xxx );
     vec3 isYZ = step( x0.zww, x0.yyz );
     //  i0.x = dot( isX, vec3( 1.0 ) );
     i0.x = isX.x + isX.y + isX.z;
     i0.yzw = 1.0 - isX;
 
     //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
     i0.y += isYZ.x + isYZ.y;
     i0.zw += 1.0 - isYZ.xy;
 
     i0.z += isYZ.z;
     i0.w += 1.0 - isYZ.z;
 
     // i0 now contains the unique values 0,1,2,3 in each channel
     vec4 i3 = clamp( i0, 0.0, 1.0 );
     vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
     vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );
 
     //  x0 = x0 - 0.0 + 0.0 * C 
     vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
     vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
     vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
     vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;
 
     // Permutations
     i = mod(i, 289.0); 
     float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
     vec4 j1 = permute( permute( permute( permute (
              i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
             + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
             + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
             + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
     // Gradients
     // ( 7*7*6 points uniformly over a cube, mapped onto a 4-octahedron.)
     // 7*7*6 = 294, which is close to the ring size 17*17 = 289.
 
     vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;
 
     vec4 p0 = grad4(j0,   ip);
     vec4 p1 = grad4(j1.x, ip);
     vec4 p2 = grad4(j1.y, ip);
     vec4 p3 = grad4(j1.z, ip);
     vec4 p4 = grad4(j1.w, ip);
 
     // Normalise gradients
     vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
     p0 *= norm.x;
     p1 *= norm.y;
     p2 *= norm.z;
     p3 *= norm.w;
     p4 *= taylorInvSqrt(dot(p4,p4));
 
     // Mix contributions from the five corners
     vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
     vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
     m0 = m0 * m0;
     m1 = m1 * m1;
     return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
 
   }
 `;
 
 class WebGL {
   constructor() {
     this.renderer = new THREE.WebGLRenderer({ antialias: true });
     this.camera = new THREE.PerspectiveCamera(
       45,
       innerWidth / innerHeight,
       0.1,
       1000
     );
     this.scene = new THREE.Scene();
     this.clock = new THREE.Clock();
 
     this.renderer.outputEncoding = THREE.sRGBEncoding;
 
     this.update = this.update.bind(this);
     this.onResize = this.onResize.bind(this);
   }
 
   // Coloca el objeto renderer dentro del DOM
   // Instaciamos la clase OrbitControls para mover la camara
   // Agrega la camara y el objeto group dentro de la escena
   init() {
     const _contentCanvas = document.querySelector("#content-canvas");
 
     this.renderer.setSize(innerWidth,innerHeight);
     this.renderer.setPixelRatio(devicePixelRatio);
     this.renderer.physicallyCorrectLights = true;
 
     this.scene.add(this.camera);
 
     this.controls = new OrbitControls(this.camera, this.renderer.domElement);
 
     this.camera.position.set(0, 0, 12);
     this.camera.lookAt(this.scene.position);
 
     _contentCanvas.appendChild(this.renderer.domElement);
 
     this.initFn();
   }
 
   // Inicia todos los metodos que serviran para crear nuestro espacio y objetos
   initFn() {
     this.addMesh();
     this.addLight();
     this.addPostProcessing();
     this.update();
     this.onResize();
 
     window.addEventListener("resize", this.onResize);
   }
 
   // Crea el objeto (geometria, material y malla) para luego agregarlo al escenario
   addMesh() {
     const size = 2;
 
     const _sphereGeo = new THREE.SphereBufferGeometry(1.7,200, 200);
 
     this._sphereMat = new THREE.MeshStandardMaterial({
       metalness: 0,
       roughness: 0
     });
 
     this.uniforms = {
       uTime: { type: "f", value: 0 }
     };
 
     this._sphereMat.onBeforeCompile = (shader) => {
       shader.uniforms.uTime = this.uniforms.uTime;
 
       /***********************************************************/
                         /*****VERTEX SHADER*****/
       /***********************************************************/
 
       shader.vertexShader = `
       uniform float uTime; 
 
       varying vec2 vUv;
       varying vec3 vertexNormal;
         
       ${noise}
         
       vec3 noise(vec3 pos) {
         float n = 0.1 + (0.5 * snoise(vec4(pos,uTime)));
         // float n = n1;
         return normalize(pos) * n;
       }
 
       // http://lolengine.net/blog/2013/09/21/picking-orthogonal-vector-combing-coconuts
       vec3 orthogonal(vec3 v) {
           return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0)
           : vec3(0.0, -v.z, v.y));
       }
 
       // Any function can go here to distort p
       vec3 distorted(vec3 p) {
           return p + noise(p);
       }
 
       ${shader.vertexShader} `;
 
       shader.vertexShader = shader.vertexShader.replace(
         "#include <beginnormal_vertex>",
         `
         #include <beginnormal_vertex>
         
         float tangentFactor = 0.01;
         
         vec3 distortedPosition = distorted(position);
         vec3 tangent1 = orthogonal(normal);
         vec3 tangent2 = normalize(cross(normal, tangent1));
         vec3 nearby1 = position + tangent1 * tangentFactor;
         vec3 nearby2 = position + tangent2 * tangentFactor;
         vec3 distorted1 = distorted(nearby1);
         vec3 distorted2 = distorted(nearby2);
           
         objectNormal = normalize(cross(distorted1 - distortedPosition, distorted2 - distortedPosition));
 
         vec3 newPosition = distortedPosition;
         `
       );
 
       shader.vertexShader = shader.vertexShader.replace(
         "#include <begin_vertex>",
         "vec3 transformed = newPosition;"
       );
     };
 
     this.sphereMesh = new THREE.Mesh(_sphereGeo, this._sphereMat);
 
     this.sphereMesh.rotation.x = Math.PI / 2;
     this.sphereMesh.rotation.y = Math.PI / 2;
     this.scene.add(this.sphereMesh);
   }
 
   // Actualiza cualquier cambio, para luego representarlo en el canvas
   update() {
     this.render();
     const time = this.clock.getElapsedTime() * 0.5;
 
     this.uniforms.uTime.value = time;
 
     requestAnimationFrame(this.update);
   }
 
   addLight() {
     const ambientLight = new THREE.HemisphereLight(
       0xddeeff, // sky color
       0x202020, // ground color
       2 // intensity
     );
 
     this.scene.add(ambientLight);
 
     this.lightTop = new THREE.DirectionalLight(0xe6c9f7, 1);
     this.lightTop.position.set(0, 200, 200);
     this.scene.add(this.lightTop);
 
     this.lightBottom = new THREE.DirectionalLight(0x36e8e8, 0.2);
     this.lightBottom.position.set(0, -200, 200);
     this.scene.add(this.lightBottom);
   }
 
   addPostProcessing() {
     this.effectComposer = new EffectComposer(this.renderer);
     this.effectComposer.renderToScreen = true;
     this.effectComposer.setSize(
       window.innerWidth * window.devicePixelRatio,
       window.innerHeight * window.devicePixelRatio
     );
 
     this.renderPass = new RenderPass(this.scene, this.camera);
     this.effectComposer.addPass(this.renderPass);
 
     this.RGBShiftPass = new ShaderPass(RGBShiftShader);
     this.RGBShiftPass.material.uniforms.amount.value = 0.002
     this.effectComposer.addPass(this.RGBShiftPass);
 
     this.FXAAPass = new ShaderPass(FXAAShader);
     this.FXAAPass.material.uniforms.resolution.value.x = 1 / window.innerWidth;
     this.FXAAPass.material.uniforms.resolution.value.y = 1 / window.innerHeight;
     this.effectComposer.addPass(this.FXAAPass);
 
     const filmPass = new FilmPass(
       0.35, // noise intensity
       0.025, // scanline intensity
       648, // scanline count
       false // grayscale
     );
     this.effectComposer.addPass(filmPass);
   }
 
   // Rescala el canvas y escenario
   onResize() {
     const _w = window.innerWidth * window.devicePixelRatio;
     const _h = window.innerHeight * window.devicePixelRatio;
 
     this.renderer.setSize(_w, _h);
     this.effectComposer.setSize(_w, _h);
     this.camera.aspect = _w / _h;
 
     this.FXAAPass.material.uniforms.resolution.value.x = 1 / window.innerWidth;
     this.FXAAPass.material.uniforms.resolution.value.y = 1 / window.innerHeight;
 
     this.camera.updateProjectionMatrix();
   }
 
   // Renderiza nuestro escenario
   render() {
     //this.renderer.render(this.scene, this.camera);
     this.effectComposer.render(this.clock.getDelta());
   }
 }
 
 const webgl = new WebGL();
 webgl.init();
 
 