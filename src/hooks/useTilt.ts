import { useEffect, useRef } from 'react';

/**
 * 3D card tilt effect — card follows mouse cursor, tilting in perspective.
 * Apply ref to a container, children with .tilt-child class will tilt.
 */
export function useTilt<T extends HTMLElement>(intensity = 8) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -intensity;
      const rotateY = ((x - centerX) / centerX) * intensity;

      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      el.style.transition = 'transform 0.1s ease-out';

      // Tilt children
      const children = el.querySelectorAll<HTMLElement>('.tilt-child');
      children.forEach((child) => {
        child.style.transform = `translateZ(20px)`;
      });
    };

    const handleLeave = () => {
      el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
      el.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

      const children = el.querySelectorAll<HTMLElement>('.tilt-child');
      children.forEach((child) => {
        child.style.transform = 'translateZ(0)';
      });
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [intensity]);

  return ref;
}
