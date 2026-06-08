import { useState, useEffect } from "react";
import TaskMatch from "./TaskMatch.jsx";
import InvitePage from "./InvitePage.jsx";

function getRoute() {
  return window.location.hash.startsWith("#/invite/") ? "invite" : "app";
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    function onHash() { setRoute(getRoute()); }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return route === "invite" ? <InvitePage /> : <TaskMatch />;
}
