let toastLib = null;

const getToastLib = async () => {
  if (!toastLib) {
    toastLib = await import("sonner");
  }
  return toastLib;
};

export const appToast = {
  success: async (message, options) => {
    const { toast } = await getToastLib();
    return toast.success(message, options);
  },
  error: async (message, options) => {
    const { toast } = await getToastLib();
    return toast.error(message, options);
  },
  info: async (message, options) => {
    const { toast } = await getToastLib();
    return toast(message, options);
  },
  warning: async (message, options) => {
    const { toast } = await getToastLib();
    return toast.warning(message, options);
  },
  loading: async (message, options) => {
    const { toast } = await getToastLib();
    return toast.loading(message, options);
  },
  promise: async (promise, messages) => {
    const { toast } = await getToastLib();
    return toast.promise(promise, messages);
  },
  dismiss: async (id) => {
    const { toast } = await getToastLib();
    return toast.dismiss(id);
  }
};
