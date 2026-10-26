import { useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useSelector } from 'react-redux';
import type { State } from '../../common/types';
import type { Layout, RockName } from './types';
import namesSnapshot from './rockNames.snapshot.json';
import { HOME_LOGO_MOBILE_QUERY, homeLogoComposition } from './compositions';
import SingleSkeleton from '../commonFeatures/singleSkeleton';
import messages from '../../common/error_messages.json';
import siteStyles from '../menu.module.scss';
import styles from './homeLogo.module.scss';

type Renderer = typeof import('./WordLogo')['default'];
interface PreparedLogo { key: string; layout?: Layout; Renderer?: Renderer; failed?: boolean }
const names: RockName[] = namesSnapshot;

// The public catalogue and vector outlines are deliberately frozen frontend assets.
export default function HomeLogo() {
    const mobile=useMediaQuery({query:HOME_LOGO_MOBILE_QUERY});
    const dark=useSelector((state: State)=>state.isDarkTheme);
    const configuration=homeLogoComposition(mobile);
    const [attempt,setAttempt]=useState(0);
    const [prepared,setPrepared]=useState<PreparedLogo>();
    const requestKey=configuration.id+':'+attempt;
    useEffect(()=>{
        const controller=new AbortController();
        Promise.all([import('./layoutCache'),import('./WordLogo')]).then(async ([cache,renderer])=>{
            controller.signal.throwIfAborted();
            const layout=await cache.getLayout(configuration,names,controller.signal);
            if(!controller.signal.aborted)setPrepared({key:requestKey,layout,Renderer:renderer.default});
        }).catch(()=>{
            if(!controller.signal.aborted)setPrepared({key:requestKey,failed:true});
        });
        return ()=>controller.abort();
    },[configuration,requestKey]);
    const current=prepared?.key===requestKey?prepared:undefined;
    const layout=current?.layout, Renderer=current?.Renderer;
    const loading=!layout&&!current?.failed;
    return <div className={styles.frame+' '+(dark?styles.dark:'')} data-home-logo={configuration.id} aria-busy={loading}>
        <SingleSkeleton loading={loading} width="100%" height="100%">
            {layout&&Renderer?
                <Renderer key={layout.id} layout={layout} reveal={mobile ? 'sequence' : 'centre'} replay={1} title={messages.home_logo_label}/>:
                current?.failed?<div className={styles.fallback} role="alert">
                    <p>{messages.home_logo_failed}</p>
                    <button type="button" className={siteStyles.submitButton} onClick={()=>setAttempt(value=>value+1)}>
                        {messages.maintenance_retry}
                    </button>
                </div>:null}
        </SingleSkeleton>
    </div>;
}