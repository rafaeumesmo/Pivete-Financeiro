import { useState, useEffect } from "react";
import MainApp from "./MainApp.jsx";
import InvitePage from "./InvitePage.jsx";
import BoraPage from "./components/BoraPage.jsx";

function getRoute() {
  const h = window.location.hash;
  if (h.startsWith("#/invite/")) return "invite";
  if (h.startsWith("#/bora/"))   return "bora";
  return "app";
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    function onHash() { setRoute(getRoute()); }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route === "invite") return <InvitePage />;
  if (route === "bora")   return <BoraPage />;
  return <MainApp />;
}
