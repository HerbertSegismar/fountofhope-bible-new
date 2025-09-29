import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  GestureResponderEvent,
} from "react-native";

interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
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
  // Base styles for the button container
  const baseButtonStyle =
    "py-3 px-6 rounded-lg flex-row justify-center items-center";

  // Determine background and border styles based on variant
  const getButtonStyle = () => {
    switch (variant) {
      case "secondary":
        return `${baseButtonStyle} bg-secondary`;
      case "outline":
        return `${baseButtonStyle} border-2 border-primary bg-transparent`;
      default:
        return `${baseButtonStyle} bg-primary`;
    }
  };

  // Determine text color based on variant
  const getTextStyle = () => {
    const baseTextStyle = "text-lg font-semibold";
    return variant === "outline"
      ? `${baseTextStyle} text-primary`
      : `${baseTextStyle} text-white`;
  };

  // Set activity indicator color depending on variant
  const activityIndicatorColor =
    variant === "outline" ? "#3B82F6" /* primary blue */ : "white";

  return (
    <TouchableOpacity
      className={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={disabled || loading ? 1 : 0.7}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={activityIndicatorColor}
          className="mr-2"
        />
      )}
      <Text className={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};
