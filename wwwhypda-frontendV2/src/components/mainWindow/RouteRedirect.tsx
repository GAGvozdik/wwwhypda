import type { ReactNode } from 'react';
import { Navigate, type NavigateProps } from 'react-router-dom';
import { useRoutePresentation } from './routePresentationContext';

// Keep the public placeholder visible until the global route exit has finished.
export default function RouteRedirect({fallback=null,...props}:NavigateProps & {fallback?:ReactNode}) {
    const {phase}=useRoutePresentation();
    const redirect=phase==='exiting'?null:<Navigate {...props}/>;
    return fallback?<>{fallback}{redirect}</>:redirect;
}