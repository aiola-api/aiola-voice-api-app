import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      dir="ltr"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-white !text-gray-900 !border-gray-200 shadow-lg animate-in slide-in-from-right-full !w-80 min-w-[200px]",
          description: "group-[.toast]:!text-gray-700",
          actionButton:
            "group-[.toast]:!bg-gray-800 group-[.toast]:!text-white hover:group-[.toast]:!bg-gray-700",
          cancelButton:
            "group-[.toast]:!bg-gray-100 group-[.toast]:!text-gray-800 hover:group-[.toast]:!bg-gray-200",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
