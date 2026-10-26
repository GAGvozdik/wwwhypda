import { useId, useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Layout, RevealMode } from './types';
import { wordOutline, outlineUnits } from './wordOutlines';
import { useLogoAnimation } from './useLogoAnimation';
import styles from './homeLogo.module.scss';
interface Props { layout: Layout; reveal: RevealMode; replay: number; title: string }
export default function WordLogo({layout,reveal,replay,title}: Props) {
    const ref=useRef<SVGSVGElement>(null), titleId=useId();
    useLogoAnimation(ref,layout,replay,reveal);
    useLayoutEffect(()=>{
        const svg=ref.current;
        if(!svg) return;
        const verify=()=>{
            let mismatches=0;
            let firstMismatch: unknown;
            svg.querySelectorAll<SVGGElement>('[data-word-reveal]').forEach((element,index)=>{
                const raw=element.getBBox(),word=layout.words[index];
                const actual={x:raw.x,y:raw.y,width:raw.width,height:raw.height};
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
    const ids=[...new Set(layout.words.map(word=>word.rt_id))];
    return <svg ref={ref} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-labelledby={titleId}
        className={styles.wordLogo} data-composition={layout.id} data-palette="multi" data-renderer="outlines">
        <title id={titleId}>{title}</title>
        <defs>{ids.map(id=><path key={id} id={`${titleId}-word-${id}`} d={wordOutline(id).path}/>)}</defs>
        {layout.words.map(word=><g key={word.order} data-word-reveal="" data-order={word.order} data-rock-id={word.rt_id}
            style={{'--word-color':`var(--ink-${word.colorSlot+1})`} as CSSProperties}>
            <title>{word.rt_name}</title>
            <use data-word-shape="" href={`#${titleId}-word-${word.rt_id}`}
                transform={`translate(${word.x} ${word.y}) rotate(${word.rotation}) scale(${word.fontSize/outlineUnits})`}/>
        </g>)}
    </svg>;
}