import { useMediaQuery } from 'react-responsive';
const duration = { enter: 220, exit: 180 };
export function useDialogMotion() {
    const reduced = useMediaQuery({ query: '(prefers-reduced-motion: reduce)' });
    return reduced ? 0 : duration;
}