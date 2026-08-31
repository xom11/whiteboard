'use client';

import { useEffect, useState } from 'react';

import './paperBackground.css';
import { isOutsidePage, type PageElement } from './pageCamera';


type ExApi = any;

/** Dò lại nhiều nhất một lần mỗi ngần này ms. */
const CHECK_THROTTLE_MS = 500;

export interface OffPageNoticeProps {
  api: ExApi | null;
  /** Nền kẻ dòng có đang bật không. Tắt thì không có vách, không có gì để báo. */
  enabled: boolean;
}

/**
 * Báo cho giáo viên biết có nét vẽ nằm ngoài trang.
 *
 * Vách trang là vách CỨNG: nội dung ngoài trang không kéo tới xem được
 * chừng nào nền kẻ dòng còn bật. Ta cố ý KHÔNG tự thu nhỏ hay dịch nội dung
 * về trong trang — đó là scene của giáo viên, sửa hộ là ghi đè công sức của
 * họ. Chỉ nói ra rồi để họ quyết.
 *
 * Dò liên tục có tiết lưu chứ không chỉ lúc bật: ảnh PDF import SAU khi đã
 * bật cũng có thể rơi ra ngoài trang.
 */
export function OffPageNotice({ api, enabled }: OffPageNoticeProps) {
  const [outside, setOutside] = useState(false);

  useEffect(() => {
    if (!api || !enabled) {
      setOutside(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = () => {
      try {
        const elements = (api.getSceneElements?.() ?? []) as PageElement[];
        setOutside(isOutsidePage(elements));
      } catch {
        /* API chưa sẵn sàng — lần đổi scene sau sẽ thử lại. */
      }
    };

    check();

    const unsubscribe = api.onChange?.(() => {
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        check();
      }, CHECK_THROTTLE_MS);
    });

    return () => {
      unsubscribe?.();
      // Hẹn giờ còn treo sẽ setState sau unmount nếu không dọn.
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [api, enabled]);

  if (!enabled || !outside) return null;

  return (
    <div className="wb-offpage-notice" role="status" aria-live="polite">
      Có nội dung nằm ngoài trang. Tắt nền kẻ dòng để xem.
    </div>
  );
}
