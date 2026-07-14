import { useState, useEffect } from 'react';

export function useRouter() {
  return {
    replace(path: string) {
      const hashPath = path.startsWith('/') ? `#${path}` : `#/${path}`;
      window.location.hash = hashPath;
    },
  };
}

export function useHashPath() {
  const [hash, setHash] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return hash;
}
