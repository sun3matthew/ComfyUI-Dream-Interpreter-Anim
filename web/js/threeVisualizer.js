import * as THREE from 'three';
import { api } from '../../../scripts/api.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as dat from 'three/addons/libs/lil-gui.module.min'


const visualizer = document.getElementById("visualizer");
const container = document.getElementById("container");
const progressDialog = document.getElementById("progress-dialog");
const progressIndicator = document.getElementById("progress-indicator");

const gui = new dat.GUI({ width: 150 });
const fov = 75;
let fpsSet = 8;
const params = {
    fov: fov,
    fps: fpsSet
  };
  

gui.add(params, 'fov', 10, 120).name('Zoom').step(0.1).onChange(function () {
    camera.fov = params.fov;
    camera.updateProjectionMatrix();
});

gui.add(params, 'fps', 1, 60).name('FPS').step(1).onChange(function () {
    fpsSet = params.fps;
});

const renderer = new THREE.WebGLRenderer({ antialias: true, extensions: {
    derivatives: true
}});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);

// scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const ambientLight = new THREE.AmbientLight(0xffffff);


const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const pointLight = new THREE.PointLight(0xffffff, 15);
camera.add(pointLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();
controls.enablePan = true;
controls.enableDamping = true;

let textureList = [];

// Handle window resize event
window.onresize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
};

var lastHdriImage = "";
var needUpdate = false;
let frameCounter = 0;
let time = Date.now();
let fps = 8;

function frameUpdate() {
    var hdriImage = visualizer.getAttribute("hdri_image");
    if (hdriImage == lastHdriImage) {
        if (needUpdate) {
            controls.update();
            renderer.render(scene, camera);

            if (textureList.length != 0 && textureList.length != 1) {

                let maxFrameCounter = textureList.length;

                // Frame counter
                let currentTime = Date.now();
                let newFrameCounter = currentTime - time;
                // to int
                newFrameCounter = Math.floor(newFrameCounter * fpsSet / 1000);
                newFrameCounter = newFrameCounter % maxFrameCounter;
                if (newFrameCounter != frameCounter) {
                    frameCounter = newFrameCounter;
                    scene.environment = textureList[frameCounter];
                    scene.background = textureList[frameCounter];
                }
            }
        }
        requestAnimationFrame(frameUpdate);
    
    } else {
        needUpdate = false;
        scene.clear();
        progressDialog.open = true;
        lastHdriImage = hdriImage;
        main(JSON.parse(lastHdriImage));
    }
}

async function main(hdriImageParams) {
    let hdriTexture;
    console.log(hdriImageParams);
    if (hdriImageParams?.filename) {
        textureList = [];

        const filename = hdriImageParams.filename;
        // dreamsave_00028.png
        // find "dreamsave_"
        let fileNumber = filename.slice(filename.lastIndexOf("_") + 1, filename.lastIndexOf("."));
        let fileInt = parseInt(fileNumber);

        const hdriImageUrl = api.apiURL('/view?' + new URLSearchParams(hdriImageParams)).replace(/extensions.*\//, "");
        const hdriLoader = new THREE.TextureLoader();
        hdriTexture = await hdriLoader.loadAsync(hdriImageUrl);
        hdriTexture.mapping = THREE.EquirectangularReflectionMapping;
        hdriTexture.colorSpace = THREE.SRGBColorSpace;

        for (let i = 0; i < fileInt; i++) {
            let newFileNumber = i.toString().padStart(5, '0');
            hdriImageParams.filename = `dreamsave_${newFileNumber}.png`;
            const hdriImageUrl2 = api.apiURL('/view?' + new URLSearchParams(hdriImageParams)).replace(/extensions.*\//, "");
            hdriTexture = await hdriLoader.loadAsync(hdriImageUrl2);
            hdriTexture.mapping = THREE.EquirectangularReflectionMapping;
            hdriTexture.colorSpace = THREE.SRGBColorSpace;
            textureList.push(hdriTexture);
        }
    }

    if (hdriTexture) {
        scene.environment = hdriTexture;
        scene.background = hdriTexture;
    }
   
    needUpdate = true;
    time = Date.now();

    // Assume ambientLight and camera have been defined somewhere above this snippet
    scene.add(ambientLight);
    scene.add(camera);

    progressDialog.close();

    frameUpdate();

    }

main();