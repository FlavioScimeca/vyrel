import { SymbolView } from "expo-symbols";
import {
  Description,
  FieldError,
  Input,
  Label,
  TextField,
  useThemeColor,
} from "heroui-native";
import { type Ref, useState } from "react";
import type { TextInput } from "react-native";
import { Pressable, View } from "react-native";

type PasswordFieldProps = {
  autoComplete: "current-password" | "new-password";
  error?: string;
  inputRef?: Ref<TextInput>;
  label: string;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  returnKeyType?: "done" | "next";
  showRequirements?: boolean;
  value: string;
};

export function PasswordField({
  autoComplete,
  error,
  inputRef,
  label,
  onBlur,
  onChangeText,
  onSubmitEditing,
  returnKeyType,
  showRequirements = false,
  value,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const muted = useThemeColor("muted");

  return (
    <TextField isInvalid={error !== undefined} isRequired>
      <Label>{label}</Label>
      <View className="relative">
        <Input
          autoComplete={autoComplete}
          className="pr-14"
          onBlur={onBlur}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder="Enter your password…"
          ref={inputRef}
          returnKeyType={returnKeyType}
          secureTextEntry={!isVisible}
          submitBehavior={returnKeyType === "next" ? "submit" : "blurAndSubmit"}
          value={value}
        />
        <Pressable
          accessibilityLabel={isVisible ? "Hide password" : "Show password"}
          accessibilityRole="button"
          className="absolute top-0 right-1 size-12 items-center justify-center"
          onPress={() => setIsVisible((current) => !current)}
        >
          <SymbolView
            name={
              isVisible
                ? {
                    android: "visibility_off",
                    ios: "eye.slash",
                    web: "visibility_off",
                  }
                : {
                    android: "visibility",
                    ios: "eye",
                    web: "visibility",
                  }
            }
            size={20}
            tintColor={muted}
          />
        </Pressable>
      </View>
      {showRequirements ? (
        <Description>Use at least 8 characters.</Description>
      ) : null}
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
