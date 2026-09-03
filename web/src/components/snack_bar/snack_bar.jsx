import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

function snack_bar({
  open,
  severity,
  message,
  handleClose,
}) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={3000}
      onClose={handleClose}
      anchorOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        sx={{ width: "100%" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}

export default snack_bar;