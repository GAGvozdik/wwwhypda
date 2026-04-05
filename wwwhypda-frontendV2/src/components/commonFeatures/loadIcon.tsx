import CircularProgress from '@mui/material/CircularProgress';

type LoadIconProps = {
    size?: number;
};

const LoadIcon: React.FC<LoadIconProps> = ({ size = 30 }) => {
    return (
        <CircularProgress
            size={size}
            sx={{
                color: 'var(--border)',
                display: 'flex',
                justifyContent: 'center',
                alignContent: 'center',
                justifyItems: 'center',
                alignItems: 'center',
            }}
        />
    );
};

export default LoadIcon;

