import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  AnimationMixer,
  Color,
  AmbientLight,
  PointLight,
  VideoTexture,
  MathUtils,
  ColorManagement,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js'
import { TextureOverlapShader } from './TextureOverlapShader'
import { Pane, TpChangeEvent } from 'tweakpane'

const baseURL = import.meta.env.BASE_URL

async function buildThree() {
  // setup renderer and scene
  const renderer = new WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  ColorManagement.enabled = true
  document.body.appendChild(renderer.domElement)
  const scene = new Scene()
  scene.background = new Color(0x0095FF)

  // setup lights
  scene.add(new AmbientLight(0x0095FF))
  const pointLight1 = new PointLight(0xFFFFFF, 5.0)
  pointLight1.position.set(1, 2, 1)
  scene.add(pointLight1)
  const pointLight2 = new PointLight(0xFFFFFF, 3.0)
  pointLight2.position.set(-1, -1, -2)
  scene.add(pointLight2)

  // load glb
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(`${baseURL}/model-and-camera.glb`)
  scene.add(gltf.scene)

  // setup camera
  const camera = gltf.cameras[0] as PerspectiveCamera
  camera.aspect = window.innerWidth / window.innerHeight
  const originalFov = camera.fov
  const updateCameraFov = (width: number, height: number) => {
    if (width > height) { // landscape
      const fov = 2.0 * Math.atan(Math.tan(MathUtils.degToRad(originalFov * 0.5)) / (width / height))
      camera.fov = MathUtils.radToDeg(fov)
    } else { // portrait
      camera.fov = originalFov
    }
  }
  updateCameraFov(window.innerWidth, window.innerHeight)
  camera.updateProjectionMatrix()

  // setup camera animation
  const mixer = new AnimationMixer(gltf.scene)
  const action = mixer.clipAction(gltf.animations.find(a => a.name === 'CameraAction')!)
  action.play()

  // setup video
  const video = document.createElement('video')
  video.autoplay = true
  video.muted = true
  video.loop = true
  video.src = `${baseURL}/video.mp4`
  video.play()

  // setup postprocessing
  const renderPass = new RenderPass(scene, camera)
  const composer = new EffectComposer(renderer)
  composer.addPass(renderPass)
  const videoOverlapPass = new ShaderPass(TextureOverlapShader)
  videoOverlapPass.uniforms.overlappedTexture.value = new VideoTexture(video)
  videoOverlapPass.uniforms.rate.value = 0.5
  videoOverlapPass.uniforms.aspect.value = window.innerWidth / window.innerHeight
  composer.addPass(videoOverlapPass)
  composer.addPass(new ShaderPass(GammaCorrectionShader))

  // setup resize
  function handleResize() {
    const width = window.innerWidth
    const height = window.innerHeight
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    composer.setSize(width, height)
    camera.aspect = width / height
    updateCameraFov(width, height)
    camera.updateProjectionMatrix()
    videoOverlapPass.uniforms.aspect.value = width / height
  }
  window.addEventListener('resize', handleResize)

  // setup gui
  const pane = new Pane();
  const params = {
    rate: 0.5,
  }
  pane.addBinding(params, 'rate', { min: 0.0, max: 1.0 })
    .on('change', (ev: TpChangeEvent) => {
      videoOverlapPass.uniforms.rate.value = ev.value
    })


  // setup animation loop
  function animate() {
    requestAnimationFrame(animate)
    mixer.setTime(video.currentTime)
    composer.render()
  }
  animate()
}

buildThree()