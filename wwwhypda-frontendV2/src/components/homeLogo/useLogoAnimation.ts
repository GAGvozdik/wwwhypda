import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import { gsap } from 'gsap';
import type { Layout, RevealMode } from './types';
export function useLogoAnimation(ref: RefObject<SVGSVGElement | null>, layout: Layout, replay: number, mode: RevealMode) {
    useLayoutEffect(() => {
        const svg=ref.current;
        if (!svg) return;
        // Animate only wrapper attributes: outline geometry and SVG rotation stay untouched.
        const elements=Array.from(svg.querySelectorAll<SVGGElement>('[data-word-reveal]'));
        const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
        const frame=mode==='sequence' && layout.id==='C12' ? svg.closest<HTMLElement>('[data-home-logo]') : null;
        const timeline=gsap.timeline({paused:true});
        const finish=()=>{ timeline.pause(); gsap.set(elements,{attr:{opacity:1}}); if(frame)gsap.set(frame,{height:0,marginTop:0,marginBottom:0,opacity:0}); };
        const onMotion=()=>{ if(motion.matches) finish(); };
        if (!replay || motion.matches) finish();
        else {
            gsap.set(elements,{attr:{opacity:0}});
            let revealEnd=0;
            layout.words.forEach((word,index)=>{
                const delay=mode==='left' ? word.bbox.x/layout.width*1.2 :
                    mode==='centre' ? Math.hypot((word.bbox.x-layout.width/2)/layout.width,(word.bbox.y-layout.height/2)/layout.height)*2 :
                    index/Math.max(1,layout.words.length-1)*1.6;
                revealEnd=Math.max(revealEnd,delay+.75);
                timeline.to(elements[index],{attr:{opacity:1},duration:.75,ease:'power2.inOut'},delay);
            });
            if(frame) {
                // Let the completed mobile mark settle, then reclaim its space for the main content.
                timeline.to(frame,{opacity:0,duration:.35,ease:'power2.inOut'},revealEnd+.6);
                timeline.to(frame,{height:0,marginTop:0,marginBottom:0,duration:.65,ease:'power2.inOut'},revealEnd+.8);
            }
            timeline.play(0);
        }
        motion.addEventListener('change',onMotion);
        return ()=>{motion.removeEventListener('change',onMotion);timeline.kill();gsap.set(elements,{attr:{opacity:1}});if(frame)gsap.set(frame,{clearProps:"height,marginTop,marginBottom,opacity"});};
        // A settings change stops the current effect and restores the final state; it never replays it.
    },[ref,layout,replay,mode]);
}
