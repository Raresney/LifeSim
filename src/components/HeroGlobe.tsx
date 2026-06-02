'use client';

import { useEffect, useRef } from 'react';

export default function HeroGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    import('globe.gl').then((mod) => {
      const Globe = mod.default;
      const globe = new (Globe as any)(container)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundColor('rgba(0,0,0,0)')
        .showGraticules(false)
        .showAtmosphere(true)
        .atmosphereColor('#87CEEB')
        .atmosphereAltitude(0.18)
        .pointOfView({ lat: 35, lng: 20, altitude: 2.0 }, 0)
        .width(container.clientWidth)
        .height(container.clientHeight);

      const globeMat = globe.globeMaterial();
      globeMat.bumpScale = 3;

      const renderer = globe.renderer();
      renderer.domElement.style.outline = 'none';
      renderer.setClearColor(0x000000, 0);

      globeRef.current = globe;

      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.6;
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.enableZoom = false;
      controls.enableRotate = false;
      controls.enablePan = false;
    });

    const handleResize = () => {
      if (!globeRef.current || !container) return;
      globeRef.current.width(container.clientWidth);
      globeRef.current.height(container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeRef.current && container) {
        const canvas = container.querySelector('canvas');
        if (canvas) canvas.remove();
        globeRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  );
}
