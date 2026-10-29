import { Box, Typography, Switch } from "@mui/material";

function ToggleRow({ label, description, checked, onChange, disabled = false }) {
  return (
    <Box sx={styles.row}>
      <Box sx={styles.info}>
        <Typography sx={styles.label}>{label}</Typography>
        {description && (
          <Typography sx={styles.description}>{description}</Typography>
        )}
      </Box>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        size="small"
        sx={styles.switch}
      />
    </Box>
  );
}

const styles = {
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    py: 1.3,
    borderBottom: "1px solid #f2f4f8",
    "&:last-child": { borderBottom: "none" },
  },

  info: {
    flex: 1,
    pr: 2,
  },

  label: {
    fontSize: "13.5px",
    fontWeight: 500,
    color: "#27344b",
  },

  description: {
    fontSize: "12px",
    color: "#8b97aa",
    mt: 0.3,
  },

  switch: {
    "& .MuiSwitch-switchBase.Mui-checked": {
      color: "#3f7ff2",
    },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
      bgcolor: "#3f7ff2",
    },
  },
};

export default ToggleRow;

