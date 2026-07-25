import {
  ImpactFeedbackStyle,
  impactAsync,
  NotificationFeedbackType,
  notificationAsync,
  selectionAsync,
} from "expo-haptics";

const ignoreUnavailableHaptics = (promise: Promise<void>): void => {
  promise.catch(() => undefined);
};

export const haptics = {
  danger: () =>
    ignoreUnavailableHaptics(
      notificationAsync(NotificationFeedbackType.Warning)
    ),
  selection: () => ignoreUnavailableHaptics(selectionAsync()),
  soft: () => ignoreUnavailableHaptics(impactAsync(ImpactFeedbackStyle.Soft)),
  success: () =>
    ignoreUnavailableHaptics(
      notificationAsync(NotificationFeedbackType.Success)
    ),
};
