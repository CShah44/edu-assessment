import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const GoogleTagManager = () => {
  const location = useLocation();

  useEffect(() => {
    // Push the new route to dataLayer
    if (window.dataLayer) {
      window.dataLayer.push({
        event: "pageview",
        page: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
};
