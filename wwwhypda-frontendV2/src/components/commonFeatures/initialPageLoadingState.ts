export interface FrameClock { frame(callback:()=>void):()=>void }
const browserClock:FrameClock={frame(callback){const id=requestAnimationFrame(callback);return ()=>cancelAnimationFrame(id);}};
export function createInitialPageLoading(notify:(busy:boolean)=>void,clock:FrameClock=browserClock) {
    const entries=new Map<string,boolean>(),paints=new Map<string,()=>void>();
    let started=false,finished=false,generation=0,cancelSettle:(()=>void)|undefined;
    const clearSettle=()=>{generation++;cancelSettle?.();cancelSettle=undefined;};
    const allReady=()=>![...entries.values()].some(Boolean);
    const reconcile=()=>{
        clearSettle();
        if(!started||finished||!allReady())return;
        const current=generation;
        cancelSettle=clock.frame(()=>{
            if(current!==generation)return;
            cancelSettle=clock.frame(()=>{
                if(current!==generation)return;
                cancelSettle=undefined;
                if(started&&!finished&&allReady()){finished=true;notify(false);}
            });
        });
    };
    const set=(id:string,busy:boolean)=>{
        if(finished)return;
        entries.set(id,busy);reconcile();
    };
    return {
        set,
        remove(id:string){paints.get(id)?.();paints.delete(id);entries.delete(id);if(!finished)reconcile();},
        paint(id:string){
            if(finished||!entries.has(id))return;
            paints.get(id)?.();
            let cancelled=false;
            let cancel=clock.frame(()=>{
                if(cancelled)return;
                cancel=clock.frame(()=>{
                    if(cancelled)return;
                    paints.delete(id);
                    if(entries.has(id))set(id,false);
                });
            });
            paints.set(id,()=>{cancelled=true;cancel();});
        },
        start(){if(finished)return;started=true;reconcile();},
        dispose(){
            started=false;clearSettle();
            paints.forEach(cancel=>cancel());paints.clear();
        },
        isBusy:()=>!finished,
    };
}
export type InitialPageLoading=ReturnType<typeof createInitialPageLoading>;