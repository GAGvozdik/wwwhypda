import { useEffect } from 'react';
import type { RefObject } from 'react';
import { gsap } from 'gsap';
import type { Layout, RevealMode } from './types';
export function useLogoAnimation(ref: RefObject<SVGSVGElement | null>, layout: Layout, replay: number, mode: RevealMode) {
    useEffect(() => {
        const svg=ref.current;
        if (!svg) return;
        // Animate only wrapper attributes: outline geometry and SVG rotation stay untouched.
        const elements=Array.from(svg.querySelectorAll<SVGGElement>('[data-word-reveal]'));
        const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
        const timeline=gsap.timeline({paused:true});
        const finish=()=>{ timeline.pause(); gsap.set(elements,{attr:{opacity:1}}); };
        const onMotion=()=>{ if(motion.matches) finish(); };
        if (!replay || motion.matches) finish();
        else {
            gsap.set(elements,{attr:{opacity:0}});
            layout.words.forEach((word,index)=>{
                const delay=mode==='left' ? word.bbox.x/layout.width*1.2 :
                    mode==='centre' ? Math.hypot((word.bbox.x-layout.width/2)/layout.width,(word.bbox.y-layout.height/2)/layout.height)*2 :
                    index/Math.max(1,layout.words.length-1)*1.6;
                timeline.to(elements[index],{attr:{opacity:1},duration:.75,ease:'power2.inOut'},delay);
            });
            timeline.play(0);
        }
        motion.addEventListener('change',onMotion);
        return ()=>{motion.removeEventListener('change',onMotion);timeline.kill();gsap.set(elements,{attr:{opacity:1}});};
        // A settings change stops the current effect and restores the final state; it never replays it.
    },[ref,layout,replay,mode]);
}
