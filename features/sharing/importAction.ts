/** One preview owns one action. A successful commit stays locked until a new
 * preview is opened; failed transactions can be retried. This closes the gap
 * before React renders a disabled button, including same-tick repeated taps. */
export const createSplitImportAction = <T>(persist: () => T | Promise<T>) => {
  let pending: Promise<T> | null = null;
  return () => {
    if (pending) return pending;
    pending = Promise.resolve().then(persist).catch((error: unknown) => {
      pending = null;
      throw error;
    });
    return pending;
  };
};
