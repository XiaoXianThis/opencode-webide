import "@heroui/react";

declare module "@heroui/react" {
  interface ButtonRootProps {
    variant?: "primary" | "ghost" | "secondary" | "tertiary" | "danger" | "danger-soft" | "outline" | "light" | "flat";
    color?: string;
    startContent?: React.ReactNode;
    endContent?: React.ReactNode;
    isIconOnly?: boolean;
    isDisabled?: boolean;
    isLoading?: boolean;
    onPress?: () => void;
  }

  interface LinkRootProps {
    isExternal?: boolean;
  }
}
