import Image, { type ImageProps } from "next/image";

export function VyrelLogo({
  className,
  ...props
}: Omit<ImageProps, "alt" | "height" | "src" | "width">) {
  return (
    <Image
      alt=""
      aria-hidden
      className={className}
      height={100}
      src="/assets/logo.png"
      width={100}
      {...props}
    />
  );
}
