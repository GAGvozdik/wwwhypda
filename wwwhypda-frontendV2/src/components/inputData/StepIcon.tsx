import type { StepIconProps } from '@mui/material/StepIcon';
import Check from '@mui/icons-material/Check';
import { CustomStepIconRoot, StepNumberCircle } from './steps';

export default function CustomStepIcon(props: StepIconProps) {
    const { active, completed, className, icon } = props;

    return (
        <CustomStepIconRoot ownerState={{ active, completed }} className={className}>
            {completed ? (
                <Check className="MuiStepIcon-completedIcon" />
            ) : (
                <StepNumberCircle ownerState={{ active }}>{icon}</StepNumberCircle>
            )}
        </CustomStepIconRoot>
    );
}
