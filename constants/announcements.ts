export type AppAnnouncement = {
  id: string;
  version: string;
  date: string;
  title: string;
  message: string;
};

// Keep newest entries first. Each id is shown once per user on app launch.
export const APP_ANNOUNCEMENTS: AppAnnouncement[] = [
  {
    id: "v1.4.1-pomodoro-status",
    version: "1.4.1",
    date: "2026-10-12",
    title: "更新 v1.4.1 のお知らせ",
    message: "Androidのポモドーロタイマーを改善しました。通知欄・ロック画面に経過時間を表示し、集中・休憩の切替を音で知らせます。アプリ表示中の終了は音だけで知らせます。終了後もポモドーロ画面を維持します。通知とアラームの許可が必要です。",
  },
  {
    id: "v1.4.0-pomodoro",
    version: "1.4.0",
    date: "2026-10-12",
    title: "更新 v1.4.0 のお知らせ",
    message: "ポモドーロタイマーを改善しました。集中・休憩時間の変更、スリープ後の時間復元、自動切替に合わせた終了通知に対応しました。通知は次の48回の切替まで予約され、タイマー画面を開くと更新されます。",
  },
  {
    id: "v1.2.0-update",
    version: "1.2.0",
    date: "2026-04-04",
    title: "更新 v1.2.0 のお知らせ",
    message:
      "アプリを快適に使用できるよう、様々な更新をしました。\n\n新機能\n・各タスクに通知を複数設定できるようにし、それぞれ ON / OFF ですぐ切り替えができるようになりました。\n・回数タスクを作成したときに単位を変更できるようになりました。",
  },
  {
    id: "v1.0.0-welcome",
    version: "1.0.0",
    date: "2026-03-09",
    title: "初回リリースのお知らせ",
    message:
      "購入いただきありがとうございました。\nこのアプリはまだ機能が少ないですが、今後アップデートを予定しております。不満な点や、ほしい機能など意見をもらえれば検討いたしますのでお問い合わせいただけると嬉しいです。",
  },
];
