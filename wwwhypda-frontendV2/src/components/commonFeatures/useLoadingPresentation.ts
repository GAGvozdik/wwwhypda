import { useLayoutEffect, useState } from 'react';
import { createLoadingPresentation, type LoadingPhase } from './loadingPresentation';

export function useLoadingPresentation(loading: boolean, skipExit = false): LoadingPhase {
    const [phase,setPhase]=useState<LoadingPhase>(loading?'loading':'ready');
    const [controller]=useState(()=>createLoadingPresentation(loading,setPhase));
    useLayoutEffect(()=>{
        const media=window.matchMedia('(prefers-reduced-motion: reduce)');
        const update=()=>controller.setLoading(loading,media.matches || skipExit);
        update();media.addEventListener('change',update);
        return ()=>{media.removeEventListener('change',update);controller.dispose();};
    },[loading,controller,skipExit]);
    // Hide content on the very render that starts a request, before the effect runs.
    return loading?'loading':phase;
}