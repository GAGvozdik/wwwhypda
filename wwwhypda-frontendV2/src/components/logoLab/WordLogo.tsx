import { useId, useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Layout, PaletteMode, RevealMode } from './types';
import { useLogoAnimation } from './useLogoAnimation';
import styles from './logoLab.module.scss';
interface Props { layout: Layout; palette: PaletteMode; reveal: RevealMode; replay: number; title: string }
export default function WordLogo({layout,palette,reveal,replay,title}: Props) {
    const ref=useRef<SVGSVGElement>(null), titleId=useId();
    useLogoAnimation(ref,layout,replay,reveal);
    useLayoutEffect(()=>{
        const svg=ref.current;
        if(!svg) return;
        const verify=()=>{
            let mismatches=0;
            let firstMismatch: unknown;
            svg.querySelectorAll('text').forEach((element,index)=>{
                const raw=element.getBBox(),word=layout.words[index];
                const actual=word.rotation ? {x:word.x+word.y-raw.y-raw.height,y:word.y+raw.x-word.x,width:raw.height,height:raw.width} :
                    {x:raw.x,y:raw.y,width:raw.width,height:raw.height};
                if(actual.x<word.bbox.x-.1 || actual.y<word.bbox.y-.1 || actual.x+actual.width>word.bbox.x+word.bbox.width+.1 ||
                    actual.y+actual.height>word.bbox.y+word.bbox.height+.1) {
                    mismatches++; firstMismatch ??= {name:word.rt_name,expected:word.bbox,actual};
                }
            });
            svg.dataset.boundsMismatches=String(mismatches);
            svg.dataset.boundsDetail=firstMismatch ? JSON.stringify(firstMismatch) : '';
        };
        verify();
        const observer=new ResizeObserver(verify); observer.observe(svg);
        return ()=>observer.disconnect();
    },[layout]);
    return <svg ref={ref} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-labelledby={titleId}
        className={styles.wordLogo} data-composition={layout.id} data-palette={palette}>
        <title id={titleId}>{title}</title>
        {layout.words.map(word=><text key={word.order} x={word.x} y={word.y}
            transform={word.rotation ? `rotate(90 ${word.x} ${word.y})` : undefined}
            style={{fontSize:`var(--logo-lab-word-${word.fontSize})`,fontWeight:word.weight,
                '--word-color':`var(--ink-${palette==='mono' ? 1 : palette==='duo' ? word.colorSlot%2+1 : word.colorSlot+1})`} as CSSProperties}
            data-order={word.order} data-rock-id={word.rt_id}>{word.rt_name}</text>)}
    </svg>;
}
