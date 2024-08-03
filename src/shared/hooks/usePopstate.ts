import { useEffect } from "react";

const usePopstate = (callback: () => void) => {
  useEffect(() => {
    window.addEventListener("popstate", callback);

    return () => {
      window.removeEventListener("popstate", callback);
    };
  }, [callback]);
};

export default usePopstate;
