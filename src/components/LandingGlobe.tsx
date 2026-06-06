'use client';

import { useEffect, useRef, useState } from 'react';
import { IASI_CENTER, LOCATION_POINTS } from '../data/locations';

interface Props {
  zooming: boolean;
  onZoomComplete?: () => void;
}

export default function LandingGlobe({ zooming, onZoomComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const initDone = useRef(false);
  const zoomingRef = useRef(false);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (!containerRef.current || initDone.current) return;
    initDone.current = true;

    let countryFeatures: any[] = [];

    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(topology => {
        import('topojson-client').then(topojson => {
          countryFeatures = (topojson.feature(topology, topology.objects.countries) as any).features;
          if (globeRef.current) {
            globeRef.current.polygonsData(countryFeatures);
          }
        }).catch(() => {});
      })
      .catch(() => {});

    const poiPoints = LOCATION_POINTS.map(loc => ({
      lat: loc.lat, lng: loc.lng, name: loc.name,
      color: 'rgba(0, 122, 255, 0.5)', size: 0.04,
    }));

    import('globe.gl').then((mod) => {
      if (!containerRef.current) return;
      const Globe = mod.default;
      const globe = new (Globe as any)(containerRef.current!)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('')
        .backgroundColor('rgba(0,0,0,0)')
        .showGraticules(false)
        .pointOfView({ lat: 30, lng: 10, altitude: 2.5 }, 0)
        .polygonsData(countryFeatures)
        .polygonCapColor((d: any) => {
          if (d.id === '642') return 'rgba(59, 130, 246, 0.12)';
          return 'rgba(0,0,0,0)';
        })
        .polygonSideColor(() => 'rgba(0,0,0,0)')
        .polygonStrokeColor((d: any) => {
          if (d.id === '642') return 'rgba(59, 130, 246, 0.7)';
          return 'rgba(255,255,255,0.15)';
        })
        .polygonAltitude((d: any) => d.id === '642' ? 0.004 : 0.001)
        .pointsData(poiPoints)
        .pointLat('lat')
        .pointLng('lng')
        .pointColor('color')
        .pointAltitude(0.006)
        .pointRadius('size')
        .atmosphereColor('#87CEEB')
        .atmosphereAltitude(0.25)
        .width(containerRef.current!.clientWidth)
        .height(containerRef.current!.clientHeight);

      const globeMat = globe.globeMaterial();
      globeMat.bumpScale = 3;

      const renderer = globe.renderer();
      renderer.domElement.style.outline = 'none';
      renderer.domElement.style.background = 'transparent';
      renderer.setClearColor(0x000000, 0);

      const scene = globe.scene();
      scene.background = null;

      globeRef.current = globe;

      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableDamping = true;
      controls.dampingFactor = 0.15;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableRotate = false;

      // Smooth fly to Iasi region on load
      setTimeout(() => {
        globe.pointOfView(
          { lat: IASI_CENTER.lat - 5, lng: IASI_CENTER.lng - 15, altitude: 2.0 },
          4000
        );
      }, 500);
    });

    const handleResize = () => {
      if (!globeRef.current || !containerRef.current) return;
      globeRef.current.width(containerRef.current.clientWidth);
      globeRef.current.height(containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeRef.current) {
        try {
          const renderer = globeRef.current.renderer();
          if (renderer) renderer.dispose();
          const controls = globeRef.current.controls();
          if (controls) controls.dispose();
        } catch {}
        if (containerRef.current) {
          const canvas = containerRef.current.querySelector('canvas');
          if (canvas) canvas.remove();
        }
        globeRef.current = null;
      }
    };
  }, []);

  // Handle zoom transition — CSS scale only, no camera movement
  useEffect(() => {
    if (!zooming || !globeRef.current || zoomingRef.current) return;
    zoomingRef.current = true;

    // Stop auto-rotate so the globe holds position
    const controls = globeRef.current.controls();
    controls.autoRotate = false;

    // White flash at 700ms — before the scale gets extreme
    setTimeout(() => {
      setShowFlash(true);
    }, 700);

    // Complete transition after flash is opaque
    setTimeout(() => {
      onZoomComplete?.();
    }, 1300);
  }, [zooming, onZoomComplete]);

  return (
    <>
      {/* Globe container — globe.gl owns this div's DOM children */}
      <div
        ref={containerRef}
        className="landing-globe-container"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          background: 'transparent',
          overflow: 'visible',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          // CSS scale zooms the rendered globe without clipping —
          // the sphere stays spherical because transform works in compositor space
          transition: zooming
            ? 'transform 1.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease 0.9s'
            : 'none',
          transform: zooming ? 'scale(2.5)' : 'scale(1)',
          opacity: zooming ? 0 : 1,
          transformOrigin: 'center center',
        }}
      />

      {/* White flash — masks the seam between globe and next page */}
      {showFlash && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'white',
            opacity: 0,
            animation: 'globe-flash-in 0.5s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes globe-flash-in {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
          `,
        }}
      />
    </>
  );
}
