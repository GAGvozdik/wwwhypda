import { createContext, useContext } from 'react';
import { useLocation, type Location } from 'react-router-dom';
import type { RouteView } from './routePresentation';
export const RoutePresentationContext=createContext<(RouteView & {target:Location})|null>(null);
export function useRoutePresentation():RouteView {
    const location=useLocation();
    const view=useContext(RoutePresentationContext);
    if(!view)return {location,phase:'ready'};
    // Reject outgoing redirects on the same render as navigation, before layout effects run.
    const leaving=view.target.key!==view.location.key || view.target.pathname!==view.location.pathname ||
        view.target.search!==view.location.search || view.target.hash!==view.location.hash;
    return leaving?{location:view.location,phase:'exiting'}:view;
}