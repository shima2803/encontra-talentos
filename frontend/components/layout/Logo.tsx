'use client';

import { useState } from 'react';
import Link from 'next/link';

function Logo({
  iconSize = 58,
  className = '',
}: {
  iconSize?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href="/"
      className={`inline-flex shrink-0 items-center gap-3 ${className}`}
      aria-label="Ir para a página inicial"
    >
      {imgError ? (
        <FallbackIcon size={iconSize} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logoLupa.png"
          alt="Logo Encontra Talentos"
          width={iconSize}
          height={iconSize}
          className="block shrink-0 object-contain"
          style={{
            width: `${iconSize}px`,
            height: `${iconSize}px`,
          }}
          onError={() => setImgError(true)}
        />
      )}

      <div className="flex items-center gap-1">
        <span className="text-[22px] font-extrabold tracking-tight text-slate-900">
          Encontra
        </span>

        <span className="text-[22px] font-extrabold tracking-tight text-teal-500">
          Talentos
        </span>
      </div>
    </Link>
  );
}

function FallbackIcon({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
      }}
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white"
    >
      ET
    </div>
  );
}

export { Logo };
export default Logo;