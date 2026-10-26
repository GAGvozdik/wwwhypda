import { useLayoutEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { createRoutePresentation, type RouteView } from './routePresentation';
import { RoutePresentationContext } from './routePresentationContext';

export default function RouteTransition({children}: {children:ReactNode}) {
    const target=useLocation();
    const [view,setView]=useState<RouteView>(()=>({location:target,phase:'entering'}));
    const [controller]=useState(()=>createRoutePresentation(target,setView));
    useLayoutEffect(()=>{
        const media=window.matchMedia('(prefers-reduced-motion: reduce)');
        const update=()=>controller.update(target,media.matches);
        update();
        media.addEventListener('change',update);
        return ()=>{
            media.removeEventListener('change',update);
            controller.dispose();
        };
    },[target,controller]);
    return <RoutePresentationContext.Provider value={{...view,target}}>{children}</RoutePresentationContext.Provider>;
}