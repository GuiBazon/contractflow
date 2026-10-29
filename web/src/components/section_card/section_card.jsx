import { Box, Typography } from "@mui/material";

function SectionCard({ title, children, action }) {
  return (
    <Box sx={styles.card}>
      <Box sx={styles.header}>
        <Typography sx={styles.title}>{title}</Typography>
        {action && <Box>{action}</Box>}
      </Box>
      {children}
    </Box>
  );
}

const styles = {
  card: {
    bgcolor: "#fff",
    border: "1px solid #eef1f6",
    borderRadius: "12px",
    p: 3,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    mb: 2.5,
  },

  title: {
    fontSize: "14.5px",
    fontWeight: 700,
    color: "#182338",
  },
};

export default SectionCard;

