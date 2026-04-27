type Dimension = 'physical' | 'intellectual' | 'creative';

type DimensionIconProps = {
  category: Dimension;
  className?: string;
};

function BaseIcon({
  className,
  background,
  children,
}: {
  className: string;
  background?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {background ? <circle cx="32" cy="32" r="28" fill={background} /> : null}
      {children}
    </svg>
  );
}

export default function DimensionIcon({
  category,
  className = 'h-11 w-11',
}: DimensionIconProps) {
  if (category === 'physical') {
    return (
      <BaseIcon className={className} background="#ECFDF5">
        <rect x="13" y="27" width="7" height="10" rx="2" fill="#4F9E69" />
        <rect x="20" y="24" width="5" height="16" rx="2" fill="#73B785" />
        <rect x="25" y="29.5" width="14" height="5" rx="2.5" fill="#2F855A" />
        <rect x="39" y="24" width="5" height="16" rx="2" fill="#73B785" />
        <rect x="44" y="27" width="7" height="10" rx="2" fill="#4F9E69" />
      </BaseIcon>
    );
  }

  if (category === 'intellectual') {
    return (
      <BaseIcon className={className}>
        <path
          d="M32 16C25.6487 16 20.5 21.1487 20.5 27.5C20.5 31.5374 22.5807 35.0888 25.7297 37.1405C26.5352 37.6653 27 38.5949 27 39.5562V42H37V39.5562C37 38.5949 37.4648 37.6653 38.2703 37.1405C41.4193 35.0888 43.5 31.5374 43.5 27.5C43.5 21.1487 38.3513 16 32 16Z"
          fill="#5EA4F2"
        />
        <rect x="27.5" y="43.5" width="9" height="3.5" rx="1.75" fill="#3B82F6" />
        <rect x="28.5" y="48" width="7" height="3" rx="1.5" fill="#1D4ED8" />
        <path
          d="M28 27C28 24.7909 29.7909 23 32 23C34.2091 23 36 24.7909 36 27"
          stroke="#1D4ED8"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </BaseIcon>
    );
  }

  return (
    <BaseIcon className={className}>
      <path
        d="M27 23.5V41.5C27 44.5376 24.5376 47 21.5 47C18.4624 47 16 44.5376 16 41.5C16 38.4624 18.4624 36 21.5 36C22.8135 36 24.0194 36.4609 24.9648 37.2296V27.5L44 22V35.5C44 38.5376 41.5376 41 38.5 41C35.4624 41 33 38.5376 33 35.5C33 32.4624 35.4624 30 38.5 30C39.8135 30 41.0194 30.4609 41.9648 31.2296V18.5L27 23.5Z"
        fill="#D68A28"
      />
      <path
        d="M27 23.5L42 19"
        stroke="#F1C36E"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M27 30L42 25.5"
        stroke="#F1C36E"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </BaseIcon>
  );
}
