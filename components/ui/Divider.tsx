import { ComponentProps } from "react";
import { cx } from "@/lib/utils";

export function Divider({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("h-px w-full bg-border-subtle my-6", className)}
      {...props}
    />
  );
}
