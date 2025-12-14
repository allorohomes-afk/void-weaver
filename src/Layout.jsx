import React from 'react';
import Header from '@/components/layout/Header';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative">
      <style>{`
        /* Scanline Animation */
        @keyframes scanline-move {
          0% { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }

        .scanlines {
          background: linear-gradient(
            to bottom,
            rgba(255,255,255,0),
            rgba(255,255,255,0) 50%,
            rgba(0,0,0,0.3) 50%,
            rgba(0,0,0,0.3)
          );
          background-size: 100% 4px;
        }

        .scanline-bar {
          background: linear-gradient(to bottom, rgba(14, 165, 233, 0), rgba(14, 165, 233, 0.1) 50%, rgba(14, 165, 233, 0));
          animation: scanline-move 6s linear infinite;
        }

        /* Global Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          background: #020617;
        }
        ::-webkit-scrollbar-track {
          background: #020617; 
        }
        ::-webkit-scrollbar-thumb {
          background: #0f172a; 
          border: 1px solid #0ea5e9;
          border-radius: 0;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #0ea5e9; 
        }

        /* Selection */
        ::selection {
          background: rgba(14, 165, 233, 0.3); /* Cyan selection */
          color: #fff;
        }
      `}</style>

      {/* 3D Morphing Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <iframe 
          src="https://my.spline.design/thresholddarkambientui-v0gkZCfi6zXm69kE0wccy70f/" 
          frameBorder="0" 
          width="100%" 
          height="100%" 
          className="w-full h-full"
          title="3D Background"
        />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10">
        <Header />
        {children}
      </div>

      {/* Global Retro Overlays */}
      <div className="fixed inset-0 pointer-events-none z-50 mix-blend-overlay opacity-30 scanlines"></div>
      <div className="fixed inset-0 pointer-events-none z-50 scanline-bar h-[20vh] w-full top-0 left-0"></div>
      
      {/* Vignette / CRT Tint */}
      <div className="fixed inset-0 pointer-events-none z-40 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.6)_100%)]"></div>

      {/* Subtle Grid Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.05]"
        style={{ 
          backgroundImage: 'linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      ></div>
    </div>
  );
}