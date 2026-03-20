import { toast } from "sonner";

export const appToast = {
  success: (message, options) => toast.success(message, options),
  error: (message, options) => toast.error(message, options),
  info: (message, options) => toast(message, options),
  warning: (message, options) => toast.warning(message, options),
  loading: (message, options) => toast.loading(message, options),
  promise: (promise, messages) => toast.promise(promise, messages),
  dismiss: (id) => toast.dismiss(id)
};
