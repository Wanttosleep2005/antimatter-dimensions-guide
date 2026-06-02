import { useRef, useEffect, useState, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number; // ms stagger delay
  className?: string;
}

export function ScrollReveal({ children, delay = 0, className = '' }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.setTimeout(() => setVisible(true), delay);
          observer.unobserve(node);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${visible ? 'is-revealed' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
