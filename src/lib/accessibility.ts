export const speak = (text: string) => {
  try {
    (window as any).speak?.(text);
  } catch (e) {}
};

export const visualAlert = (message: string, highlightSelector?: string) => {
  try {
    (window as any).triggerVisualAlert?.({ message, highlightSelector });
  } catch (e) {}
};

export const notify = (message: string) => {
  try {
    (window as any).triggerVisualAlert?.({ message });
  } catch (e) {}
};
