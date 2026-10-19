import React from "react";
import ReactDOM from "react-dom/client";
import HighSociety from "./high-society/App";
import NoThanks from "./no-thanks/App";
import FamilyInc from "./family-inc/App";
import Zertz from "./zertz/App";
import Yinsh from "./yinsh/App";
import Dvonn from "./dvonn/App";
import Gipf from "./gipf/App";
import Lyngk from "./lyngk/App";
import ForSale from "./for-sale/App";
import ShangriLa from "./shangri-la/App";
import Acquire from "./acquire/App";
import Condottiere from "./condottiere/App";
import RideTheRails from "./ride-the-rails/App";
import Clans from "./clans/App";
import Twixt from "./twixt/App";
import Ecosystem from "./ecosystem/App";
import FujiFlush from "./fuji-flush/App";
import Tigris from "./tigris/App";
import CoralReef from "./coral-reef/App";
import Savanna from "./savanna/App";
import Medici from "./medici/App";
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
  {
    path: "/dvonn",
    element: <Dvonn />,
  },
  {
    path: "/gipf",
    element: <Gipf />,
  },
  {
    path: "/lyngk",
    element: <Lyngk />,
  },
  {
    path: "/for-sale",
    element: <ForSale />,
  },
  {
    path: "/shangri-la",
    element: <ShangriLa />,
  },
  {
    path: "/acquire",
    element: <Acquire />,
  },
  {
    path: "/condottiere",
    element: <Condottiere />,
  },
  {
    path: "/ride-the-rails",
    element: <RideTheRails />,
  },
  {
    path: "/clans",
    element: <Clans />,
  },
  {
    path: "/twixt",
    element: <Twixt />,
  },
  {
    path: "/ecosystem",
    element: <Ecosystem />,
  },
  {
    path: "/fuji-flush",
    element: <FujiFlush />,
  },
  {
    path: "/tigris",
    element: <Tigris />,
  },
  {
    path: "/coral-reef",
    element: <CoralReef />,
  },
  {
    path: "/savanna",
    element: <Savanna />,
  },
  {
    path: "/medici",
    element: <Medici />,
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
