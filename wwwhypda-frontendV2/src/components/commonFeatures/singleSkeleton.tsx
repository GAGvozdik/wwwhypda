import * as React from 'react';
import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';
import LoadIcon from './loadIcon';
import LoadingSwap from './loadingSwap';
import messages from '../../common/error_messages.json';

interface SingleSkeletonProps {
    loading?: boolean;
    error?: string | null;
    children: React.ReactNode;
    height?: string;
    width?: string;
    margin?: string;
    backgroundColor?: string;
    isLoadIcon?: boolean;
    overlay?: boolean;
}


function SingleSkeletonView({ loading = false, error = null, margin, height, width, children, backgroundColor, isLoadIcon, overlay }: SingleSkeletonProps) {
    if (loading) {
        return (
            <Box role="status" aria-label={messages.ui_loading}
                sx={{
                    width: width ?? '100%',
                    height: height ?? '100%',
                    minHeight: height ? undefined : 'var(--loading-min-height)',
                    margin: margin ?? '',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: overlay ? 'absolute' : 'relative',
                    inset: overlay ? 0 : undefined,
                    zIndex: overlay ? 1 : undefined,
                    bgcolor: overlay ? (backgroundColor ?? 'var(--drawer-color)') : undefined,
                    // overflowY: 'auto'
                }}
            >
            <Skeleton
                variant="rectangular"
                animation="wave"
                width="100%"
                height="100%"
                sx={{
                position: 'absolute',
                borderRadius: 2,
                bgcolor: backgroundColor ?? 'var(--table-color)',
                }}
            />

            {isLoadIcon ? <LoadIcon size={60} /> : ""}
            </Box>
        );
    }

    if (error) {
        return (

            <Box role="alert"
                sx={{
                    width: width ?? '100%',
                    height: height ?? '100%',
                    minHeight: height ? undefined : 'var(--loading-min-height)',
                    margin: margin ?? '',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: overlay ? 'absolute' : undefined,
                    inset: overlay ? 0 : undefined,
                    zIndex: overlay ? 1 : undefined,
                    bgcolor: overlay ? (backgroundColor ?? 'var(--drawer-color)') : 'transparent',
                }}
            >
                {/* <Skeleton
                    variant="rectangular"
                    animation="wave"
                    width="100%"
                    height="100%"
                    sx={{
                        borderRadius: 2,
                        bgcolor: backgroundColor ? backgroundColor : 'var(--table-color)',
                    }}

                >  */}
                    <div style={{
                        fontFamily: 'Afacad_Flux',
                        fontSize: 'var(--main-font-size)',
                        margin: '0.5rem',
                        color: 'var(--error-text)',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal',
                        overflow: 'hidden'
                    }}>
                        {error}
                    </div>
                {/* </Skeleton> */}
            </Box>


        );
    }

    return <>{children}</>;
}

export default function SingleSkeleton(props: SingleSkeletonProps) {
    return <LoadingSwap loading={props.loading??false} fallback={<SingleSkeletonView {...props} loading />}>
        <SingleSkeletonView {...props} loading={false}/>
    </LoadingSwap>;
}