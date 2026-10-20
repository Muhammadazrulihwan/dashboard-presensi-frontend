import { avatarClass, initials } from "@/lib/theme";

export default function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold ${avatarClass(name)}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
