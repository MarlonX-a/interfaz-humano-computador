import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface ModelViewerModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}

export default function ModelViewerModal({ open, onClose, url, title }: ModelViewerModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!containerRef.current) return;

    let mounted = true;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7fafc);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7.5);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const loader = new GLTFLoader();
    setLoading(true);
    loader.load(
      url,
      (gltf) => {
        if (!mounted) return;
        const model = gltf.scene;
        // center and scale model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3()).length();
        const center = box.getCenter(new THREE.Vector3());
        model.position.x += -center.x;
        model.position.y += -center.y;
        model.position.z += -center.z;
        const scaleFactor = 1.5 / size;
        model.scale.setScalar(scaleFactor);
        scene.add(model);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('GLTF load error', err);
        toast.error('No se pudo cargar el modelo (formato no compatible o CORS)');
        setLoading(false);
      }
    );

    const animate = () => {
      if (!mounted) return;
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      mounted = false;
      window.removeEventListener('resize', onResize);
      controls.dispose();
      try {
        if (renderer) {
          renderer.dispose();
          if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        }
      } catch (e) {
        // ignore
      }
    };
  }, [open, url]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-[90%] max-w-4xl h-[80%] bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">{title || 'Modelo 3D'}</div>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          {loading && (
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <div className="text-sm text-gray-600">Cargando modelo...</div>
            </div>
          )}
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
