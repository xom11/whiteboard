'use client';

// Client-only wrapper around Excalidraw that lets us reach for static helpers
// like `MainMenu.DefaultItems.*`. ExcalidrawWhiteboardView dynamic-imports this
// file so SSR never evaluates @excalidraw/excalidraw, while inside this file we
// can use plain static imports (the entire module loads on the client).

import React from 'react';
import {
  Excalidraw,
  MainMenu,
  Footer,
  WelcomeScreen,
} from '@excalidraw/excalidraw';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawProps = any;

export function ExcalidrawWithMenus(props: ExcalidrawProps) {
  const { children, ...rest } = props;
  return (
    <Excalidraw {...rest}>
      {/* Replace default menu with curated items — no socials/help/branding */}
      <MainMenu>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.DefaultItems.ToggleTheme />
      </MainMenu>
      {/* Footer slot with no content suppresses default "Made with Excalidraw" link */}
      <Footer>
        <span />
      </Footer>
      {/* WelcomeScreen slot (empty) prevents the default Excalidraw welcome panel
       *  (which includes the Excalidraw logo and social links) from appearing. */}
      <WelcomeScreen>
        <span />
      </WelcomeScreen>
      {children}
    </Excalidraw>
  );
}
