export const QUOTES = [
  { no: 1, text: "成功とは、小さな努力を毎日積み重ねることだ。", author: "ロバート・コリアー" },
  { no: 2, text: "始める方法は、話すのをやめて行動し始めることだ。", author: "ウォルト・ディズニー" },
  { no: 3, text: "未来は、今日何をするかで決まる。", author: "マハトマ・ガンディー" },
  { no: 4, text: "どんなにゆっくりでも、止まらない限り前進だ。", author: "孔子" },
  { no: 5, text: "習慣は、最初は蜘蛛の糸、最後は鎖になる。", author: "スペインのことわざ" },
  { no: 6, text: "千里の道も一歩から。", author: "老子" },
  { no: 7, text: "昨日の自分を超えること、それが最大の勝利だ。", author: "不明" },
  { no: 8, text: "努力は裏切らない。ただ、結果の時期が違うだけだ。", author: "不明" },
  { no: 9, text: "続けることが、いちばんの才能だ。", author: "不明" },
  { no: 10, text: "行動がすべてを変える。", author: "不明" },
  { no: 11, text: "今日の一歩が、明日の景色を変える。", author: "不明" },
  { no: 12, text: "やる気は行動から生まれる。", author: "不明" },
  { no: 13, text: "小さくても、毎日やれば大きくなる。", author: "不明" },
  { no: 14, text: "自分を信じることが、最初の一歩だ。", author: "不明" },
  { no: 15, text: "あきらめない人が、最後に勝つ。", author: "不明" },
  { no: 16, text: "失敗は、成功の途中経過。", author: "不明" },
  { no: 17, text: "完璧を目指すより、まず終わらせよう。", author: "不明" },
  { no: 18, text: "今日は、残りの人生の最初の日だ。", author: "不明" },
  { no: 19, text: "一度決めたら、迷わず続ける。", author: "不明" },
  { no: 20, text: "毎日の小さな積み上げが、未来を作る。", author: "不明" },
  { no: 21, text: "今やれることを、今やる。", author: "不明" },
  { no: 22, text: "やり抜く力が、夢を現実にする。", author: "不明" },
  { no: 23, text: "目標は、毎日の行動で近づく。", author: "不明" },
  { no: 24, text: "努力は、確実に自分を強くする。", author: "不明" },
  { no: 25, text: "今日を大切にする人が、未来を手にする。", author: "不明" },
  { no: 26, text: "時間は、使い方次第で味方になる。", author: "不明" },
  { no: 27, text: "昨日より少し前へ。", author: "不明" },
  { no: 28, text: "積み上げは、目に見える力になる。", author: "不明" },
  { no: 29, text: "一日一歩が、一年後の自分を作る。", author: "不明" },
  { no: 30, text: "続けた分だけ、景色が変わる。", author: "不明" },
  { no: 31, text: "小さな成功が、大きな自信になる。", author: "不明" },
  { no: 32, text: "目の前の一歩を、丁寧に。", author: "不明" },
  { no: 33, text: "できることから始めればいい。", author: "不明" },
  { no: 34, text: "やらない後悔より、やる後悔。", author: "不明" },
  { no: 35, text: "自分のペースで、止まらずに。", author: "不明" },
  { no: 36, text: "信じる力が、行動を支える。", author: "不明" },
  { no: 37, text: "昨日の自分に、今日の自分で勝つ。", author: "不明" },
  { no: 38, text: "毎日は、未来への投資だ。", author: "不明" },
  { no: 39, text: "できるだけやる。できるだけ続ける。", author: "不明" },
  { no: 40, text: "努力は静かに積み上がる。", author: "不明" },
  { no: 41, text: "少しずつが、いちばん強い。", author: "不明" },
  { no: 42, text: "始める勇気が、すべてを変える。", author: "不明" },
  { no: 43, text: "継続は、自分を裏切らない。", author: "不明" },
  { no: 44, text: "今日の努力は、明日の自分への贈り物。", author: "不明" },
  { no: 45, text: "小さな積み上げが、習慣を作る。", author: "不明" },
  { no: 46, text: "一歩ずつが、いちばん速い。", author: "不明" },
  { no: 47, text: "続けるほど、迷いは減る。", author: "不明" },
  { no: 48, text: "いつでも、今日が一番若い日。", author: "不明" },
  { no: 49, text: "やると決めたら、あとは淡々と。", author: "不明" },
  { no: 50, text: "今の一歩が、未来の標準になる。", author: "不明" },
];

export function getDailyQuoteIndex(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % QUOTES.length;
}

export function getQuoteByDate(dateString: string) {
  const index = getDailyQuoteIndex(dateString);
  return QUOTES[index];
}
