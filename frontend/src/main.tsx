import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { WalletProvider } from "./context/WalletContext";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        primaryColor: "green",
        fontFamily: "Inter, system-ui, sans-serif",
        defaultRadius: "md",
        colors: {
          green: [
            "#e6f9ee",
            "#c7f2dd",
            "#97e7bf",
            "#63db9f",
            "#35cf82",
            "#16A34A",
            "#148f41",
            "#117637",
            "#0e5e2c",
            "#0b4a22",
          ],
          blue: [
            "#e6f0ff",
            "#c7dbff",
            "#97baff",
            "#6396ff",
            "#3574ff",
            "#2563EB",
            "#1e4fcc",
            "#173ba8",
            "#112a82",
            "#0c1e5e",
          ],
        },
      }}
    >
      <Notifications />
      <BrowserRouter>
        <WalletProvider>
          <App />
        </WalletProvider>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);