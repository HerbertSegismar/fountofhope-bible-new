import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  GestureResponderEvent,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: "primary" | "secondary" | "outline";
  loading?: boolean;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  size = "medium",
}) => {
  const { theme, colorScheme, customColor } = useTheme();
  const useInlineStyles = colorScheme === "custom";

  if (useInlineStyles) {
    const getButtonStyle = () => {
      const baseStyle = {
        borderRadius: 8,
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        opacity: disabled ? 0.6 : 1,
      };

      const sizeStyles = {
        small: { paddingVertical: 8, paddingHorizontal: 16 },
        medium: { paddingVertical: 12, paddingHorizontal: 20 },
        large: { paddingVertical: 16, paddingHorizontal: 24 },
      };

      switch (variant) {
        case "secondary":
          return {
            ...baseStyle,
            ...sizeStyles[size],
            backgroundColor: theme === "dark" ? "#374151" : "#F3F4F6",
          };
        case "outline":
          return {
            ...baseStyle,
            ...sizeStyles[size],
            backgroundColor: "transparent",
            borderWidth: 2,
            borderColor: customColor,
          };
        default:
          return {
            ...baseStyle,
            ...sizeStyles[size],
            backgroundColor: customColor,
          };
      }
    };

    const getTextStyle = () => {
      const sizeStyles = {
        small: { fontSize: 14 },
        medium: { fontSize: 16 },
        large: { fontSize: 18 },
      };

      switch (variant) {
        case "secondary":
          return {
            ...sizeStyles[size],
            fontWeight: "600" as const,
            color: theme === "dark" ? "#F9FAFB" : "#374151",
          };
        case "outline":
          return {
            ...sizeStyles[size],
            fontWeight: "600" as const,
            color: customColor,
          };
        default:
          return {
            ...sizeStyles[size],
            fontWeight: "600" as const,
            color: "#FFFFFF",
          };
      }
    };

    const getActivityIndicatorColor = () => {
      switch (variant) {
        case "outline":
          return customColor;
        case "secondary":
          return theme === "dark" ? "#F9FAFB" : "#374151";
        default:
          return "#FFFFFF";
      }
    };

    return (
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={disabled || loading ? 1 : 0.7}
      >
        {loading && (
          <ActivityIndicator
            size="small"
            color={getActivityIndicatorColor()}
            style={{ marginRight: 8 }}
          />
        )}
        <Text style={getTextStyle()}>{title}</Text>
      </TouchableOpacity>
    );
  }
  const getButtonStyle = () => {
    const baseStyle = "rounded-lg flex-row justify-center items-center";

    const sizeClasses = {
      small: "py-2 px-4",
      medium: "py-3 px-6",
      large: "py-4 px-8",
    };

    if (variant === "secondary") {
      return `${baseStyle} ${sizeClasses[size]} ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-200"
      }`;
    }

    if (variant === "outline") {
      const borderColors = {
        purple: "border-purple-500",
        green: "border-green-500",
        red: "border-red-500",
        yellow: "border-yellow-500",
      };
      return `${baseStyle} ${sizeClasses[size]} border-2 ${
        borderColors[colorScheme]
      } bg-transparent`;
    }

    const bgColors = {
      purple: "bg-purple-500",
      green: "bg-green-500",
      red: "bg-red-500",
      yellow: "bg-yellow-500",
    };

    return `${baseStyle} ${sizeClasses[size]} ${bgColors[colorScheme]}`;
  };

  const getTextStyle = () => {
    const baseTextStyle = "font-semibold";

    const sizeClasses = {
      small: "text-sm",
      medium: "text-base",
      large: "text-lg",
    };

    if (variant === "secondary") {
      return `${baseTextStyle} ${sizeClasses[size]} ${
        theme === "dark" ? "text-gray-100" : "text-gray-800"
      }`;
    }

    if (variant === "outline") {
      const textColors = {
        purple: "text-purple-500",
        green: "text-green-500",
        red: "text-red-500",
        yellow: "text-yellow-500",
      };
      return `${baseTextStyle} ${sizeClasses[size]} ${textColors[colorScheme]}`;
    }

    return `${baseTextStyle} ${sizeClasses[size]} text-white`;
  };

  const getActivityIndicatorColor = () => {
    if (variant === "outline") {
      const colors = {
        purple: "#A855F7",
        green: "#10B981",
        red: "#EF4444",
        yellow: "#F59E0B",
      };
      return colors[colorScheme];
    }

    if (variant === "secondary") {
      return theme === "dark" ? "#F9FAFB" : "#374151";
    }

    return "#FFFFFF";
  };

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
          color={getActivityIndicatorColor()}
          className="mr-2"
        />
      )}
      <Text className={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};
