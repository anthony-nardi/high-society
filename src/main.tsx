import React from "react";
import ReactDOM from "react-dom/client";
import HighSociety from "./high-society/App";
import NoThanks from "./no-thanks/App";
import FamilyInc from "./family-inc/App";
import Zertz from "./zertz/App";
import Yinsh from "./yinsh/App";
import Razzia from "./razzia/App";
import reportWebVitals from "./reportWebVitals";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./shared/mobile.css";
import "./shared/animations.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { createBrowserRouter, RouterProvider } from "react-router";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <HighSociety />,
  },
  {
    path: "/high-society",
    element: <HighSociety />,
  },
  {
    path: "/no-thanks",
    element: <NoThanks />,
  },
  {
    path: "/razzia",
    element: <Razzia />,
  },
  {
    path: "/family-inc",
    element: <FamilyInc />,
  },
  {
    path: "/zertz",
    element: <Zertz />,
  },
  {
    path: "/yinsh",
    element: <Yinsh />,
  },
]);

root.render(
  <React.StrictMode>
    <MantineProvider forceColorScheme="dark">
      <Notifications position="top-left" />
      <RouterProvider router={router} />
    </MantineProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
