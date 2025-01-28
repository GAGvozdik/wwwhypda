import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Modal from '@mui/material/Modal';

import Stack from '@mui/material/Stack';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'var(--form-color)',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export default function BasicModal() {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <div style={{width: '100%', height: '100%'}}>

        <Stack spacing={2} direction="row" style={{width: '100%', height: '100%'}}>
            <Button  onClick={handleOpen} variant="contained" style={{width: '100%', height: '100%', color: 'var(--tree-text)', backgroundColor: 'var(--buttons)'}}>Сгенерировать</Button>
        </Stack>

        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={style}>
                Completed
            </Box>
        </Modal>
    </div>
  );
}
