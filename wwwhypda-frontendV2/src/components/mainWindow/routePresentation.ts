import type { Location } from 'react-router-dom';
export type RoutePhase = 'entering' | 'ready' | 'exiting';
export interface RouteView { location: Location; phase: RoutePhase }
export const ROUTE_EXIT_MS = 180;
export const ROUTE_ENTER_MS = 220;
interface Clock {
    now(): number;
    after(ms: number, callback:()=>void):()=>void;
    frame(callback:()=>void):()=>void;
}
const browserClock: Clock = {
    now:()=>Date.now(),
    after(ms,callback){const id=setTimeout(callback,ms);return ()=>clearTimeout(id);},
    frame(callback){const id=requestAnimationFrame(callback);return ()=>cancelAnimationFrame(id);}
};
const same=(a:Location,b:Location)=>a.key===b.key && a.pathname===b.pathname && a.search===b.search && a.hash===b.hash;
// Keep exactly one route mounted. A later navigation replaces the pending destination.
export function createRoutePresentation(initial: Location, notify:(view:RouteView)=>void, clock:Clock=browserClock) {
    let location=initial,target=initial,phase:RoutePhase='entering',generation=0,exitStarted=0;
    let cancelExit:(()=>void)|undefined,cancelFrame:(()=>void)|undefined;
    const emit=()=>notify({location,phase});
    const cancel=()=>{
        generation++;
        cancelExit?.();cancelExit=undefined;
        cancelFrame?.();cancelFrame=undefined;
    };
    const enter=()=>{
        if(cancelFrame)return;
        const current=generation;
        cancelFrame=clock.frame(()=>{
            if(current!==generation)return;
            cancelFrame=clock.frame(()=>{
                if(current!==generation)return;
                cancelFrame=undefined;phase='ready';emit();
            });
        });
    };
    const exit=()=>{
        if(cancelExit)return;
        const current=generation;
        cancelExit=clock.after(Math.max(0,ROUTE_EXIT_MS-(clock.now()-exitStarted)),()=>{
            if(current!==generation)return;
            cancelExit=undefined;location=target;phase='entering';emit();enter();
        });
    };
    return {
        update(next:Location,reduced=false){
            target=next;
            if(reduced){
                cancel();
                if(!same(location,next)||phase!=='ready'){location=next;phase='ready';emit();}
                return;
            }
            if(same(location,next)){
                if(phase==='exiting'){cancel();phase='ready';emit();}
                else if(phase==='entering')enter();
                return;
            }
            if(phase!=='exiting'){
                cancel();exitStarted=clock.now();phase='exiting';emit();
            }
            exit();
        },
        dispose:cancel,
        getView:():RouteView=>({location,phase}),
    };
}