import { useEffect } from 'react';

const useDocumentTitle = (title: string) => {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
};

export default useDocumentTitle;
