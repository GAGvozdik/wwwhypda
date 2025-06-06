import * as React from 'react';
import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';

interface SingleSkeletonProps {
    loading?: boolean;
    error?: string | null;
    children: React.ReactNode;
    height?: string; 
    width?: string; 
    margin?: string; 
    backgroundColor?: string;
}


export default function SingleSkeleton({ loading = false, error = null, margin, height, width, children, backgroundColor }: SingleSkeletonProps) {
    if (loading) {
        return (
            <Box
                sx={{
                    width: width ?? '100%',
                    height: height ?? '100%',
                    margin: margin ?? '',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'transparent',
                }}
            >
                <Skeleton
                    variant="rectangular"
                    animation="wave"
                    width="100%"
                    height="100%"
                    sx={{
                        borderRadius: 2,
                        bgcolor: backgroundColor ? backgroundColor : 'var(--table-color)',
                    }}
                />
            </Box>
        );
    }

    if (error) {
        return (
            <div style={{ 
                fontFamily: 'Afacad_Flux', 
                fontSize: '2vh', 
                margin: '1vh', 
                color: 'var(--error-text)', 
                wordWrap: 'break-word', 
                overflowWrap: 'break-word', 
                whiteSpace: 'normal', 
                overflow: 'hidden'
            }}>
                {error}
            </div>
        );
    }

    return <>{children}</>;
}
