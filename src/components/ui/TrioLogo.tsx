type TrioLogoProps = {
  className?: string;
};

export default function TrioLogo({ className = 'h-8 w-8' }: TrioLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="trio-top" x1="14" y1="4" x2="50" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8C8450" />
          <stop offset="1" stopColor="#746B3E" />
        </linearGradient>
        <linearGradient id="trio-left" x1="4" y1="18" x2="36" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A9AE88" />
          <stop offset="1" stopColor="#8B916D" />
        </linearGradient>
        <linearGradient id="trio-right" x1="28" y1="18" x2="60" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#586C53" />
          <stop offset="1" stopColor="#44563F" />
        </linearGradient>
      </defs>

      <path
        d="M31.2 9.3C37.2 8.9 41.9 13.1 42.7 19.1C43.5 25.4 39.7 30.7 33.3 31.6C26.8 32.5 21.4 28.7 20.4 22.5C19.4 16.2 24.5 9.8 31.2 9.3Z"
        fill="url(#trio-top)"
      />
      <path
        d="M15.9 31.8C21.3 31 26.2 34.8 27.4 40.4C28.8 46.6 25 52.1 18.8 53.4C12.7 54.6 6.8 51.1 5.3 45.3C3.9 39.5 9.8 32.7 15.9 31.8Z"
        fill="url(#trio-left)"
      />
      <path
        d="M47.6 31.8C53.7 32.7 59.6 39.5 58.2 45.3C56.7 51.1 50.8 54.6 44.7 53.4C38.5 52.1 34.7 46.6 36.1 40.4C37.3 34.8 42.2 31 47.6 31.8Z"
        fill="url(#trio-right)"
      />
    </svg>
  );
}
