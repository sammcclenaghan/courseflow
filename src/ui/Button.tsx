import type { ButtonHTMLAttributes } from "preact";
import styles from "./Button.module.css";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
};

export function Button({
  variant = "secondary",
  disabled = false,
  onClick,
  class: extra,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      {...rest}
      class={extra ? `${styles.button} ${extra}` : styles.button}
      data-variant={variant}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
    />
  );
}
