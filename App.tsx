import { useEffect, useRef, useState } from 'react';
import SceneCanvas from './components/SceneCanvas';
import { createExperienceRefState, ExperienceRefContext } from './state/experienceState';
import type { Stage } from './state/experienceState';

export default function App() {
  const stateRef = useRef(createExperienceRefState());
  const [stage, setStage] = useState<Stage>('earth');
  const stageRef = useRef<Stage>('earth');
  const targetTransition = useRef(0);
  const rafId = useRef<number | undefined>(undefined);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // --- wheel: drives the earth -> ocean dive transition only ---
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const st = stageRef.current;
      if (st === 'earth' || st === 'transition') {
        e.preventDefault();
        targetTransition.current = Math.min(
          1,
          Math.max(0, targetTransition.current + e.deltaY * 0.0009)
        );
        if (st === 'earth' && targetTransition.current > 0) setStage('transition');
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // --- mouse: drives ship zigzag steering while on page 2 ---
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      stateRef.current.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      stateRef.current.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // --- smoothing + stage-transition loop ---
  useEffect(() => {
    const tick = () => {
      const s = stateRef.current;
      s.transitionProgress += (targetTransition.current - s.transitionProgress) * 0.08;

      if (stageRef.current === 'transition' && s.transitionProgress > 0.995) {
        s.transitionProgress = 1;
        setStage('ship');
      }
      if (
        stageRef.current === 'transition' &&
        targetTransition.current <= 0 &&
        s.transitionProgress < 0.01
      ) {
        setStage('earth');
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const handleRouteEnd = () => setStage('end');

  return (
    <ExperienceRefContext.Provider value={{ state: stateRef.current }}>
      <div className="relative w-full h-full">
        <SceneCanvas stage={stage} onRouteEnd={handleRouteEnd} />

        {/* ---- Page 1 HUD ---- */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-opacity duration-700"
          style={{ opacity: stage === 'earth' ? 1 : 0 }}
        >
          <div className="hud-label text-cyan-300/70 text-xs mb-4">OCEAN X · 2025</div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
            Tổng Kết Hành Trình Đại Dương
          </h1>
          <p className="text-white/50 mt-4 max-w-md text-sm">
            Một năm khám phá, dữ liệu và những phát hiện mới dưới lòng biển sâu.
          </p>
          <div className="absolute bottom-10 flex flex-col items-center gap-2 text-white/40">
            <span className="hud-label text-[10px]">Cuộn để lặn xuống</span>
            <div className="w-px h-8 bg-gradient-to-b from-cyan-300/70 to-transparent" />
          </div>
        </div>

        {/* ---- transition flash / hint ---- */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(94,231,255,0.08), transparent 60%)',
            opacity: stage === 'transition' ? 1 : 0,
            transition: 'opacity 0.4s',
          }}
        />

        {/* ---- Page 2 HUD (top bar) ---- */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-6 pointer-events-none transition-opacity duration-700"
          style={{ opacity: stage === 'ship' || stage === 'end' ? 1 : 0 }}
        >
          <div className="hud-label text-white/60 text-[10px]">Hải Trình Khảo Sát</div>
          <div className="hud-label text-cyan-300/70 text-[10px]">
            Di chuột trái / phải để lái tàu
          </div>
        </div>

        {/* ---- end of route screen ---- */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-opacity duration-1000"
          style={{ opacity: stage === 'end' ? 1 : 0 }}
        >
          <div className="hud-label text-cyan-300/70 text-xs mb-3">Hết hải trình</div>
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Đã hoàn tất 4/4 điểm dữ liệu
          </h2>
          <button
            className="mt-8 pointer-events-auto px-6 py-2 rounded-full border border-cyan-300/40 text-cyan-200 text-sm hud-label hover:bg-cyan-300/10 transition-colors"
            onClick={() => {
              targetTransition.current = 0;
              stateRef.current.transitionProgress = 0;
              stateRef.current.routeProgress = 0;
              setStage('earth');
            }}
          >
            Xem lại
          </button>
        </div>
      </div>
    </ExperienceRefContext.Provider>
  );
}
