import * as React from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

interface BasicButtonProps {
  text: string;
  handleOpen: () => void;
}

const BasicButton: React.FC<BasicButtonProps> = ({ text, handleOpen }) => {
  return (
    <Stack spacing={2} direction="row">
      <Button  onClick={handleOpen} variant="contained" style={{color: 'var(--form-color)', backgroundColor: 'var(--menu)'}}>{text}</Button>
    </Stack>
  );
};

export default BasicButton;