import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline";
  loading?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}) => {
  const getButtonStyle = () => {
    const base = "py-3 px-6 rounded-lg flex-row justify-center items-center";

    switch (variant) {
      case "secondary":
        return `${base} bg-secondary`;
      case "outline":
        return `${base} border-2 border-primary`;
      default:
        return `${base} bg-primary`;
    }
  };

  const getTextStyle = () => {
    const base = "text-lg font-semibold";
    return variant === "outline"
      ? `${base} text-primary`
      : `${base} text-white`;
  };

  return (
    <TouchableOpacity
      className={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading && (
        <ActivityIndicator size="small" color="white" className="mr-2" />
      )}
      <Text className={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};
