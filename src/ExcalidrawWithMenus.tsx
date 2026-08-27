'use client';

// Client-only wrapper around Excalidraw that lets us reach for static helpers
// like `MainMenu.DefaultItems.*`. Whiteboard dynamic-imports this
// file so SSR never evaluates @excalidraw/excalidraw, while inside this file we
// can use plain static imports (the entire module loads on the client).

import React from 'react';
import {
  Excalidraw,
  MainMenu,
  Footer,
  WelcomeScreen,
} from '@excalidraw/excalidraw';
 
type ExcalidrawProps = any;

/** Icon cho mục menu nền bảng — 20×20 để khớp icon mặc định của Excalidraw. */
const PaperLinedIcon = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
    <rect x="2.5" y="2.5" width="15" height="15" rx="2" />
    <path d="M5 7.5h10M5 10h10M5 12.5h10" />
  </svg>
);

const PaperPlainIcon = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.25">
    <rect x="2.5" y="2.5" width="15" height="15" rx="2" />
  </svg>
);

export function ExcalidrawWithMenus(props: ExcalidrawProps) {
  // `paperLined`/`onTogglePaperLined` là của riêng ta — tách khỏi `rest`
  // để không spread prop lạ vào Excalidraw.
  const { children, paperLined, onTogglePaperLined, ...rest } = props;
  return (
    <Excalidraw {...rest}>
      {/* Replace default menu with curated items — no socials/help/branding */}
      <MainMenu>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.DefaultItems.ToggleTheme />
        {onTogglePaperLined && (
          <MainMenu.Item
            icon={paperLined ? PaperLinedIcon : PaperPlainIcon}
            onSelect={onTogglePaperLined}
            data-testid="wb-paper-toggle"
          >
            {paperLined ? 'Bảng trắng trơn' : 'Nền kẻ dòng'}
          </MainMenu.Item>
        )}
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
