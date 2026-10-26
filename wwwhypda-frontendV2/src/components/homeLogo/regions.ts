// Original WWHYPDA.svg letter extents in its 580 x 105 viewBox, scaled by 10.
export const wordmarkRegions = [[38,1112],[1123,2197],[2288,2829],[2919,3540],[3631,4177],[4288,4991],[5022,5730]] as const;
export function wordmarkRegion(x:number) {
    let closest=0,distance=Infinity;
    wordmarkRegions.forEach(([left,right],index)=>{
        const next=Math.abs(x-(left+right)/2);
        if(next<distance){distance=next;closest=index;}
    });
    return closest;
}
