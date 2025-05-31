import useTheme from "/src/contexts/Theme";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="top-center"
      className="toaster group select-none"
      visibleToasts={1}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
      }}
      {...props}
    />
  );
};

export { Toaster };
