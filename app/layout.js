export const metadata = {
  title: "Blockout — CS 1.6 Map Builder",
  description: "Beginner-friendly Counter-Strike 1.6 map blockout editor."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b0f0a" }}>{children}</body>
    </html>
  );
}
