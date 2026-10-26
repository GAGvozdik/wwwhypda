export type LoadingPhase = 'loading' | 'exiting' | 'ready';
export const MINIMUM_LOADING_MS = 750;
export const LOADING_EXIT_MS = 220;
export interface LoadingClock {
    now: () => number;
    after: (milliseconds: number, callback: () => void) => () => void;
}
const defaultClock: LoadingClock = {
    now: () => Date.now(),
    after: (milliseconds, callback) => {
        const timer=setTimeout(callback,milliseconds);
        return () => clearTimeout(timer);
    },
};
// Presentation only: requests and authorization results are never delayed here.
export function createLoadingPresentation(initial: boolean, onPhase: (phase: LoadingPhase) => void,
    clock: LoadingClock = defaultClock) {
    let loading=initial, phase: LoadingPhase=initial?'loading':'ready', reduced=false;
    let started=clock.now(), exitStarted=0, generation=0;
    let cancel: (() => void) | undefined;
    const clear=()=>{cancel?.();cancel=undefined;generation++;};
    const emit=(next: LoadingPhase)=>{if(next!==phase){phase=next;onPhase(next);}};
    const schedule=(delay: number)=>{
        const current=generation;
        cancel=clock.after(delay,()=>{if(current===generation){cancel=undefined;reconcile();}});
    };
    const reconcile=(): void=>{
        clear();
        if(loading){emit('loading');return;}
        if(phase==='ready')return;
        const remaining=MINIMUM_LOADING_MS-(clock.now()-started);
        if(remaining>0){schedule(remaining);return;}
        if(reduced){emit('ready');return;}
        if(phase!=='exiting'){exitStarted=clock.now();emit('exiting');}
        const remainingExit=LOADING_EXIT_MS-(clock.now()-exitStarted);
        if(remainingExit>0)schedule(remainingExit);else emit('ready');
    };
    return {
        setLoading(value: boolean, reduceMotion=false){
            if(value&&!loading)started=clock.now();
            loading=value;reduced=reduceMotion;reconcile();
        },
        dispose:clear,
        getPhase:()=>phase,
    };
}