interface BeaconLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BeaconLogo({ className = '', size = 'md' }: BeaconLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  };

  return (
    <svg
      viewBox="0 0 100 100"
      className={`${sizeClasses[size]} ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Beacon rays */}
      <path
        d="M40 50 L95 5 L95 25 L40 50"
        fill="hsl(var(--beacon-lime))"
        className="animate-beacon-pulse"
      />
      <path
        d="M40 50 L95 95 L95 75 L40 50"
        fill="hsl(var(--beacon-lime))"
        className="animate-beacon-pulse"
        style={{ animationDelay: '0.3s' }}
      />
      {/* Beacon circle */}
      <circle
        cx="30"
        cy="70"
        r="25"
        fill="hsl(var(--beacon-white))"
      />
    </svg>
  );
}
