import { createContext, useContext, useId, useLayoutEffect } from 'react';
import type { InitialPageLoading } from './initialPageLoadingState';
export const InitialPageLoadingContext=createContext<InitialPageLoading|null>(null);
export function useInitialPageLoading(busy:boolean) {
    const page=useContext(InitialPageLoadingContext),id=useId();
    useLayoutEffect(()=>{
        if(!page)return;
        page.set(id,busy);
        return ()=>page.remove(id);
    },[page,id,busy]);
}
export function useInitialGridReady(rowCount:number,error?:string|null) {
    const page=useContext(InitialPageLoadingContext),id=useId();
    useLayoutEffect(()=>{
        if(!page)return;
        page.set(id,!error);
        return ()=>page.remove(id);
    },[page,id,error]);
    return {
        onGridReady:()=>{if(rowCount===0)page?.paint(id);},
        onFirstDataRendered:()=>page?.paint(id),
    };
}