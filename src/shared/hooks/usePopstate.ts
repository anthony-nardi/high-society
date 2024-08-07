import { useEffect, useCallback } from "react";

const usePopstate = (callback: () => void) => {
  const memoizedCallback = useCallback(callback, [callback]);

  useEffect(() => {
    window.addEventListener("popstate", memoizedCallback);

    return () => {
      window.removeEventListener("popstate", memoizedCallback);
    };
  }, [memoizedCallback]);
};

export default usePopstate;
